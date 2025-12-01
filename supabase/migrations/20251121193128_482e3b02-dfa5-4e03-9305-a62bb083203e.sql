-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 4: Fix remaining trigger and notification functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_office_channel(p_agency_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  preferences JSONB;
  notification_enabled BOOLEAN;
BEGIN
  SELECT social_preferences INTO preferences
  FROM profiles
  WHERE id = p_user_id;

  notification_enabled := CASE p_notification_type
    WHEN 'post_reaction' THEN COALESCE((preferences->'notifications'->>'postReactions')::BOOLEAN, true)
    WHEN 'post_comment' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'comment_reply' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'friend_achievement' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'friend_milestone' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'team_reflection' THEN COALESCE((preferences->'notifications'->>'weeklyReflections')::BOOLEAN, true)
    WHEN 'post_mention' THEN true
    ELSE true
  END;

  RETURN notification_enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_on_poll(p_poll_id uuid, p_option_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  SELECT allow_multiple INTO v_allow_multiple
  FROM message_polls
  WHERE id = p_poll_id;
  
  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id
    AND user_id = auth.uid();
  END IF;
  
  INSERT INTO poll_votes (poll_id, user_id, option_id)
  VALUES (p_poll_id, auth.uid(), p_option_id)
  ON CONFLICT (poll_id, user_id, option_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hourly_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_hour_start timestamptz;
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.invitation_rate_limits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT 
    hourly_count, daily_count, monthly_count,
    hour_window_start, day_window_start, month_window_start
  INTO 
    v_hourly_count, v_daily_count, v_monthly_count,
    v_hour_start, v_day_start, v_month_start
  FROM public.invitation_rate_limits
  WHERE user_id = _user_id;

  IF v_now - v_hour_start > interval '1 hour' THEN
    v_hourly_count := 0;
    v_hour_start := v_now;
  END IF;

  IF v_now - v_day_start > interval '1 day' THEN
    v_daily_count := 0;
    v_day_start := v_now;
  END IF;

  IF v_now - v_month_start > interval '30 days' THEN
    v_monthly_count := 0;
    v_month_start := v_now;
  END IF;

  IF v_hourly_count >= 20 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'hourly_limit',
      'message', 'You can send up to 20 invitations per hour. Please try again later.',
      'retry_after', EXTRACT(EPOCH FROM (v_hour_start + interval '1 hour' - v_now))::integer,
      'current_count', v_hourly_count,
      'limit', 20
    );
  END IF;

  IF v_daily_count >= 100 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit',
      'message', 'You can send up to 100 invitations per day. Please try again tomorrow.',
      'retry_after', EXTRACT(EPOCH FROM (v_day_start + interval '1 day' - v_now))::integer,
      'current_count', v_daily_count,
      'limit', 100
    );
  END IF;

  IF v_monthly_count >= 500 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_limit',
      'message', 'You can send up to 500 invitations per month. Please try again next month.',
      'retry_after', EXTRACT(EPOCH FROM (v_month_start + interval '30 days' - v_now))::integer,
      'current_count', v_monthly_count,
      'limit', 500
    );
  END IF;

  UPDATE public.invitation_rate_limits
  SET 
    hourly_count = v_hourly_count + 1,
    daily_count = v_daily_count + 1,
    monthly_count = v_monthly_count + 1,
    hour_window_start = v_hour_start,
    day_window_start = v_day_start,
    month_window_start = v_month_start
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'hourly_remaining', 20 - v_hourly_count - 1,
    'daily_remaining', 100 - v_daily_count - 1,
    'monthly_remaining', 500 - v_monthly_count - 1
  );
END;
$function$;