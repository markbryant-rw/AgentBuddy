-- Security Fix: Add SET search_path to functions (Supabase Linter Requirement)
-- This prevents search path manipulation attacks

-- Fix 1: get_team_quarter
CREATE OR REPLACE FUNCTION public.get_team_quarter(_team_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS TABLE(quarter integer, year integer, is_financial boolean)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  fy_enabled BOOLEAN;
  fy_start_month INTEGER;
  current_month INTEGER;
  current_year INTEGER;
  months_from_fy_start INTEGER;
  calculated_quarter INTEGER;
  calculated_year INTEGER;
BEGIN
  SELECT uses_financial_year, financial_year_start_month
  INTO fy_enabled, fy_start_month
  FROM public.teams
  WHERE id = _team_id;
  
  current_month := EXTRACT(MONTH FROM _date)::INTEGER;
  current_year := EXTRACT(YEAR FROM _date)::INTEGER;
  
  IF fy_enabled AND fy_start_month IS NOT NULL THEN
    months_from_fy_start := current_month - fy_start_month;
    IF months_from_fy_start < 0 THEN
      months_from_fy_start := months_from_fy_start + 12;
    END IF;
    
    calculated_quarter := (months_from_fy_start / 3)::INTEGER + 1;
    
    IF current_month >= fy_start_month THEN
      calculated_year := current_year;
    ELSE
      calculated_year := current_year - 1;
    END IF;
    
    RETURN QUERY SELECT calculated_quarter, calculated_year, true;
  ELSE
    calculated_quarter := EXTRACT(QUARTER FROM _date)::INTEGER;
    RETURN QUERY SELECT calculated_quarter, current_year, false;
  END IF;
END;
$$;

-- Fix 2: needs_quarterly_review
CREATE OR REPLACE FUNCTION public.needs_quarterly_review(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH current_quarter AS (
    SELECT quarter, year
    FROM public.get_team_quarter(_team_id)
  )
  SELECT NOT EXISTS (
    SELECT 1 
    FROM public.quarterly_reviews qr
    CROSS JOIN current_quarter cq
    WHERE qr.user_id = _user_id 
      AND qr.team_id = _team_id
      AND qr.quarter = cq.quarter
      AND qr.year = cq.year
      AND qr.completed = true
  );
$$;

-- Fix 3: remap_quarterly_data
CREATE OR REPLACE FUNCTION public.remap_quarterly_data(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  goal_record RECORD;
  review_record RECORD;
  new_quarter_info RECORD;
BEGIN
  FOR goal_record IN 
    SELECT * FROM public.quarterly_goals WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, goal_record.created_at::DATE);
    
    UPDATE public.quarterly_goals
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = goal_record.id;
  END LOOP;
  
  FOR review_record IN 
    SELECT * FROM public.quarterly_reviews WHERE team_id = _team_id
  LOOP
    SELECT * INTO new_quarter_info
    FROM public.get_team_quarter(_team_id, review_record.created_at::DATE);
    
    UPDATE public.quarterly_reviews
    SET quarter = new_quarter_info.quarter,
        year = new_quarter_info.year
    WHERE id = review_record.id;
  END LOOP;
END;
$$;

-- Fix 4: update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE conversations 
  SET 
    updated_at = NEW.created_at,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Fix 5: log_task_activity
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'priority_changed',
      jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      )
    );
  END IF;

  -- Log due date changes
  IF (TG_OP = 'UPDATE' AND OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'due_date_changed',
      jsonb_build_object(
        'old_due_date', OLD.due_date,
        'new_due_date', NEW.due_date
      )
    );
  END IF;

  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'assigned',
      jsonb_build_object(
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 6: update_note_search_vector
CREATE OR REPLACE FUNCTION public.update_note_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_plain, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Fix 7: update_project_updated_at
CREATE OR REPLACE FUNCTION public.update_project_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create rate limiting infrastructure for send-team-invite edge function
CREATE TABLE IF NOT EXISTS public.invitation_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hourly_count integer DEFAULT 0,
  daily_count integer DEFAULT 0,
  monthly_count integer DEFAULT 0,
  hour_window_start timestamptz DEFAULT now(),
  day_window_start timestamptz DEFAULT now(),
  month_window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.invitation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Admins can view rate limits"
  ON public.invitation_rate_limits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
  ON public.invitation_rate_limits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_invitation_rate_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hourly_count integer;
  v_daily_count integer;
  v_monthly_count integer;
  v_hour_start timestamptz;
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_now timestamptz := now();
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.invitation_rate_limits (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current counts and windows
  SELECT 
    hourly_count, daily_count, monthly_count,
    hour_window_start, day_window_start, month_window_start
  INTO 
    v_hourly_count, v_daily_count, v_monthly_count,
    v_hour_start, v_day_start, v_month_start
  FROM public.invitation_rate_limits
  WHERE user_id = _user_id;

  -- Reset hourly counter if window expired
  IF v_now - v_hour_start > interval '1 hour' THEN
    v_hourly_count := 0;
    v_hour_start := v_now;
  END IF;

  -- Reset daily counter if window expired
  IF v_now - v_day_start > interval '1 day' THEN
    v_daily_count := 0;
    v_day_start := v_now;
  END IF;

  -- Reset monthly counter if window expired
  IF v_now - v_month_start > interval '30 days' THEN
    v_monthly_count := 0;
    v_month_start := v_now;
  END IF;

  -- Check limits (20/hour, 100/day, 500/month)
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

  -- Increment counters
  UPDATE public.invitation_rate_limits
  SET 
    hourly_count = v_hourly_count + 1,
    daily_count = v_daily_count + 1,
    monthly_count = v_monthly_count + 1,
    hour_window_start = v_hour_start,
    day_window_start = v_day_start,
    month_window_start = v_month_start,
    updated_at = v_now
  WHERE user_id = _user_id;

  -- Allow request
  RETURN jsonb_build_object(
    'allowed', true,
    'hourly_remaining', 20 - (v_hourly_count + 1),
    'daily_remaining', 100 - (v_daily_count + 1),
    'monthly_remaining', 500 - (v_monthly_count + 1)
  );
END;
$$;