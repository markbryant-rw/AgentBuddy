-- Phase 2: Database Security Fixes (Revised)
-- Fix 1: Add search_path to all SECURITY DEFINER functions to prevent injection attacks

CREATE OR REPLACE FUNCTION public.validate_team_code(code text)
RETURNS TABLE(team_id uuid, team_name text, agency_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.agency_id
  FROM teams t
  WHERE t.team_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_team_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_code TEXT;
BEGIN
  v_new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_team_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  UPDATE teams SET team_code = v_new_code WHERE id = p_team_id;
  RETURN v_new_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_office_channel_id UUID;
  v_agency_id UUID;
BEGIN
  SELECT t.agency_id, a.office_channel_id 
  INTO v_agency_id, v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  IF v_office_channel_id IS NULL THEN
    SELECT create_office_channel(v_agency_id) 
    INTO v_office_channel_id;
  END IF;
  
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conversation_id UUID;
BEGIN
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user1_id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user2_id
  WHERE c.type = 'direct'
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants cp3 
      WHERE cp3.conversation_id = c.id 
      AND cp3.user_id NOT IN (user1_id, user2_id)
    )
  LIMIT 1;

  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES 
      (conversation_id, user1_id, true),
      (conversation_id, user2_id, true);
  END IF;

  RETURN conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_team_channel(channel_title text, channel_type text, channel_icon text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_conversation_id UUID;
  user_team_id UUID;
BEGIN
  SELECT team_id INTO user_team_id
  FROM team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF user_team_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a team';
  END IF;

  INSERT INTO conversations (type, title, created_by, channel_type, icon, is_system_channel)
  VALUES ('group', channel_title, auth.uid(), channel_type, channel_icon, false)
  RETURNING id INTO new_conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT 
    new_conversation_id,
    tm.user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN 
        EXISTS(SELECT 1 FROM user_roles WHERE user_id = tm.user_id AND role = 'admin')
      ELSE true
    END
  FROM team_members tm
  WHERE tm.team_id = user_team_id;

  RETURN new_conversation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code text)
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT profiles.id AS user_id, profiles.full_name, profiles.email 
  FROM profiles 
  WHERE profiles.invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_channel_participant(channel_id uuid, new_user_id uuid, allow_posting boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  channel_type TEXT;
  is_admin BOOLEAN;
BEGIN
  SELECT c.channel_type INTO channel_type
  FROM conversations c
  WHERE c.id = channel_id;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = new_user_id AND role = 'admin'
  ) INTO is_admin;
  
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  VALUES (
    channel_id,
    new_user_id,
    CASE 
      WHEN channel_type = 'announcement' THEN is_admin
      ELSE allow_posting
    END
  )
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_channel_participant(channel_id uuid, participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = channel_id
    AND (c.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    ))
  ) THEN
    RAISE EXCEPTION 'Only channel creators or admins can remove participants';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conversations WHERE id = channel_id AND created_by = participant_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove channel creator';
  END IF;

  DELETE FROM conversation_participants
  WHERE conversation_id = channel_id AND user_id = participant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_personal_board(_user_id uuid, _team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _board_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM task_boards 
    WHERE created_by = _user_id 
    AND is_shared = false
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO task_boards (
    team_id, title, description, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES (
    _team_id, 'Personal Tasks', 'Your private task board', 
    '🔒', '#6366f1', false, _user_id, -1
  )
  RETURNING id INTO _board_id;

  INSERT INTO task_lists (
    team_id, board_id, title, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES 
    (_team_id, _board_id, 'To Do', 'circle', '#3b82f6', false, _user_id, 0),
    (_team_id, _board_id, 'In Progress', 'clock', '#f59e0b', false, _user_id, 1),
    (_team_id, _board_id, 'Done', 'check-circle', '#10b981', false, _user_id, 2);

  RETURN _board_id;
END;
$function$;

-- Fix 2: Move materialized views to private schema for security
CREATE SCHEMA IF NOT EXISTS private;

ALTER MATERIALIZED VIEW public.user_conversations_summary SET SCHEMA private;
ALTER MATERIALIZED VIEW public.user_effective_access_new SET SCHEMA private;
ALTER MATERIALIZED VIEW public.kpi_aggregates SET SCHEMA private;

-- Update refresh functions to reference private schema
CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.user_effective_access_new;
  RETURN NULL;
END;
$function$;