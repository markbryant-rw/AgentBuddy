-- Fix remaining SECURITY DEFINER functions by adding SET search_path = 'public'
-- This prevents schema manipulation attacks

-- 1. add_channel_participant
CREATE OR REPLACE FUNCTION public.add_channel_participant(channel_id uuid, new_user_id uuid, allow_posting boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 2. archive_inactive_user_data
CREATE OR REPLACE FUNCTION public.archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET avatar_url = NULL
  WHERE status = 'inactive'
    AND updated_at < NOW() - INTERVAL '12 months'
    AND avatar_url IS NOT NULL;
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'inactive_user_archival',
    jsonb_build_object(
      'archived_at', NOW(),
      'users_affected', 
        (SELECT COUNT(*) FROM profiles 
         WHERE status = 'inactive' 
         AND updated_at < NOW() - INTERVAL '12 months')
    )
  );
END;
$function$;

-- 3. archive_old_invitations
CREATE OR REPLACE FUNCTION public.archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM pending_invitations
  WHERE 
    status IN ('accepted', 'expired')
    AND (accepted_at < NOW() - INTERVAL '90 days' OR expires_at < NOW() - INTERVAL '90 days');
    
  INSERT INTO audit_logs (action, details)
  VALUES (
    'invitation_cleanup',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'reason', 'Automated 90-day cleanup of old invitations'
    )
  );
END;
$function$;

-- 4. auto_add_to_office_channel
CREATE OR REPLACE FUNCTION public.auto_add_to_office_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 5. auto_friend_team_members
CREATE OR REPLACE FUNCTION public.auto_friend_team_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  teammate_record RECORD;
  u1 uuid;
  u2 uuid;
  unique_code text;
BEGIN
  FOR teammate_record IN 
    SELECT user_id 
    FROM team_members 
    WHERE team_id = NEW.team_id 
      AND user_id != NEW.user_id
  LOOP
    u1 := LEAST(NEW.user_id, teammate_record.user_id);
    u2 := GREATEST(NEW.user_id, teammate_record.user_id);

    unique_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || u1::TEXT || u2::TEXT || NOW()::TEXT) FROM 1 FOR 8));

    INSERT INTO friend_connections (user_id, friend_id, accepted, invite_code)
    VALUES (u1, u2, true, unique_code)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 6. auto_set_primary_team
CREATE OR REPLACE FUNCTION public.auto_set_primary_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE profiles 
  SET primary_team_id = NEW.team_id
  WHERE id = NEW.user_id 
    AND primary_team_id IS NULL;
  RETURN NEW;
END;
$function$;

-- 7. award_bug_points
CREATE OR REPLACE FUNCTION public.award_bug_points(p_user_id uuid, p_bug_report_id uuid, p_points integer, p_reason text, p_awarded_by uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_points_id uuid;
BEGIN
  INSERT INTO public.user_bug_points (user_id, bug_report_id, points_awarded, points_reason, awarded_by)
  VALUES (p_user_id, p_bug_report_id, p_points, p_reason, p_awarded_by)
  ON CONFLICT (user_id, bug_report_id, points_reason) DO NOTHING
  RETURNING id INTO v_points_id;
  
  RETURN v_points_id;
END;
$function$;

-- 8. award_initial_bug_points
CREATE OR REPLACE FUNCTION public.award_initial_bug_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM public.award_bug_points(NEW.user_id, NEW.id, 10, 'bug_reported', NULL);
  RETURN NEW;
END;
$function$;

-- 9. check_task_assignment
CREATE OR REPLACE FUNCTION public.check_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If assigning to someone else
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    -- Check if the list is shared
    IF NOT EXISTS (
      SELECT 1 
      FROM task_lists 
      WHERE id = NEW.list_id 
      AND is_shared = true
    ) THEN
      RAISE EXCEPTION 'Cannot assign tasks to others on personal lists';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 10. create_default_lists_for_team
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 11. create_default_personal_board
CREATE OR REPLACE FUNCTION public.create_default_personal_board(_user_id uuid, _team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 12. create_office_channel
CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_channel_id UUID;
  v_agency_name TEXT;
  v_participant RECORD;
BEGIN
  SELECT name INTO v_agency_name
  FROM public.agencies
  WHERE id = p_agency_id;

  IF v_agency_name IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  INSERT INTO public.conversations (type, title, icon, is_system_channel)
  VALUES ('group', v_agency_name || ' Office', '🏢', true)
  RETURNING id INTO v_channel_id;

  FOR v_participant IN 
    SELECT id 
    FROM public.profiles 
    WHERE office_id = p_agency_id
  LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_channel_id, v_participant.id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.agencies
  SET office_channel_id = v_channel_id
  WHERE id = p_agency_id;

  PERFORM refresh_conversations_summary();

  RETURN v_channel_id;
END;
$function$;

-- 13. create_quarterly_review_notification
CREATE OR REPLACE FUNCTION public.create_quarterly_review_notification(_user_id uuid, _team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _quarter INTEGER;
  _year INTEGER;
BEGIN
  -- Get current quarter
  SELECT quarter, year INTO _quarter, _year
  FROM public.get_team_quarter(_team_id);
  
  -- Check if notification already exists for this quarter
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE user_id = _user_id 
      AND type = 'quarterly_review'
      AND metadata->>'quarter' = _quarter::text
      AND metadata->>'year' = _year::text
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    -- Create the notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      display_as_banner,
      read,
      metadata,
      expires_at
    ) VALUES (
      _user_id,
      'quarterly_review',
      'Quarterly Review Needed',
      'It''s time to complete your quarterly review and set goals for the upcoming quarter.',
      true,
      false,
      jsonb_build_object('quarter', _quarter, 'year', _year),
      now() + interval '30 days'
    );
  END IF;
END;
$function$;

-- 14. create_team_channel
CREATE OR REPLACE FUNCTION public.create_team_channel(channel_title text, channel_type text, channel_icon text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 15. delete_expired_notifications
CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$function$;

-- 16. expire_old_invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$function$;

-- 17. get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS TABLE(id uuid, type text, title text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_conversation_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1 
      WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF v_conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', v_current_user_id)
    RETURNING conversations.id INTO v_conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
    VALUES 
      (v_conversation_id, v_current_user_id, false),
      (v_conversation_id, other_user_id, false);
  END IF;
  
  -- Return the conversation details
  RETURN QUERY
  SELECT c.id, c.type, c.title, c.created_at
  FROM conversations c
  WHERE c.id = v_conversation_id;
END;
$function$;

-- 18. get_or_create_direct_conversation (with other_user_id only)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN public.get_or_create_direct_conversation(current_user_id, other_user_id);
END;
$function$;

-- 19. get_or_create_direct_conversation (with user1_id and user2_id)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 20. get_user_team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$function$;

-- 21. get_user_team_ids
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS TABLE(team_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = _user_id
$function$;

-- 22. remove_channel_participant
CREATE OR REPLACE FUNCTION public.remove_channel_participant(channel_id uuid, participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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