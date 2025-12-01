-- =============================================================================
-- GENERIC RATE LIMITING SYSTEM
-- Migration: Add generic rate limiting for all API endpoints
-- Created: 2025-11-26
-- =============================================================================

-- Create generic rate limits table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT, -- For anonymous/unauthenticated requests
    action_type TEXT NOT NULL, -- e.g., 'delete-user', 'send-notification', 'ai-chat'

    -- Counters
    hourly_count INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,

    -- Window tracking
    hour_window_start TIMESTAMPTZ DEFAULT NOW(),
    day_window_start TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    last_request_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique tracking per user/IP + action
    UNIQUE(user_id, action_type),
    UNIQUE(ip_address, action_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_action ON public.api_rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip_action ON public.api_rate_limits(ip_address, action_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_last_request ON public.api_rate_limits(last_request_at);

-- Create suspicious activity log table
CREATE TABLE IF NOT EXISTS public.suspicious_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL, -- 'rate_limit_exceeded', 'invalid_input', 'unauthorized_access'
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    request_details JSONB,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user ON public.suspicious_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created ON public.suspicious_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_severity ON public.suspicious_activity_log(severity);

-- Generic rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    _user_id UUID,
    _ip_address TEXT,
    _action_type TEXT,
    _hourly_limit INTEGER,
    _daily_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_hourly_count INTEGER;
    v_daily_count INTEGER;
    v_hour_start TIMESTAMPTZ;
    v_day_start TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_identifier_type TEXT;
BEGIN
    -- Determine which identifier to use (user_id takes precedence)
    IF _user_id IS NOT NULL THEN
        v_identifier_type := 'user';

        -- Insert or get existing record for user
        INSERT INTO public.api_rate_limits (user_id, action_type)
        VALUES (_user_id, _action_type)
        ON CONFLICT (user_id, action_type) DO NOTHING;

        -- Get current counts
        SELECT
            hourly_count, daily_count,
            hour_window_start, day_window_start
        INTO
            v_hourly_count, v_daily_count,
            v_hour_start, v_day_start
        FROM public.api_rate_limits
        WHERE user_id = _user_id AND action_type = _action_type;

    ELSIF _ip_address IS NOT NULL THEN
        v_identifier_type := 'ip';

        -- Insert or get existing record for IP
        INSERT INTO public.api_rate_limits (ip_address, action_type)
        VALUES (_ip_address, _action_type)
        ON CONFLICT (ip_address, action_type) DO NOTHING;

        -- Get current counts
        SELECT
            hourly_count, daily_count,
            hour_window_start, day_window_start
        INTO
            v_hourly_count, v_daily_count,
            v_hour_start, v_day_start
        FROM public.api_rate_limits
        WHERE ip_address = _ip_address AND action_type = _action_type;

    ELSE
        RAISE EXCEPTION 'Either user_id or ip_address must be provided';
    END IF;

    -- Reset hourly window if needed
    IF v_now - v_hour_start > INTERVAL '1 hour' THEN
        v_hourly_count := 0;
        v_hour_start := v_now;
    END IF;

    -- Reset daily window if needed
    IF v_now - v_day_start > INTERVAL '1 day' THEN
        v_daily_count := 0;
        v_day_start := v_now;
    END IF;

    -- Check hourly limit
    IF v_hourly_count >= _hourly_limit THEN
        -- Log suspicious activity
        INSERT INTO public.suspicious_activity_log (
            user_id, ip_address, action_type, reason, severity, request_details
        ) VALUES (
            _user_id, _ip_address, _action_type, 'rate_limit_exceeded', 'medium',
            jsonb_build_object(
                'limit_type', 'hourly',
                'limit', _hourly_limit,
                'current_count', v_hourly_count
            )
        );

        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'hourly_limit',
            'message', FORMAT('Rate limit exceeded. Maximum %s requests per hour allowed for this action.', _hourly_limit),
            'retry_after', EXTRACT(EPOCH FROM (v_hour_start + INTERVAL '1 hour' - v_now))::INTEGER,
            'current_count', v_hourly_count,
            'limit', _hourly_limit,
            'limit_type', 'hourly'
        );
    END IF;

    -- Check daily limit
    IF v_daily_count >= _daily_limit THEN
        -- Log suspicious activity
        INSERT INTO public.suspicious_activity_log (
            user_id, ip_address, action_type, reason, severity, request_details
        ) VALUES (
            _user_id, _ip_address, _action_type, 'rate_limit_exceeded', 'medium',
            jsonb_build_object(
                'limit_type', 'daily',
                'limit', _daily_limit,
                'current_count', v_daily_count
            )
        );

        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'daily_limit',
            'message', FORMAT('Rate limit exceeded. Maximum %s requests per day allowed for this action.', _daily_limit),
            'retry_after', EXTRACT(EPOCH FROM (v_day_start + INTERVAL '1 day' - v_now))::INTEGER,
            'current_count', v_daily_count,
            'limit', _daily_limit,
            'limit_type', 'daily'
        );
    END IF;

    -- Update counters
    IF v_identifier_type = 'user' THEN
        UPDATE public.api_rate_limits
        SET
            hourly_count = v_hourly_count + 1,
            daily_count = v_daily_count + 1,
            hour_window_start = v_hour_start,
            day_window_start = v_day_start,
            last_request_at = v_now,
            updated_at = v_now
        WHERE user_id = _user_id AND action_type = _action_type;
    ELSE
        UPDATE public.api_rate_limits
        SET
            hourly_count = v_hourly_count + 1,
            daily_count = v_daily_count + 1,
            hour_window_start = v_hour_start,
            day_window_start = v_day_start,
            last_request_at = v_now,
            updated_at = v_now
        WHERE ip_address = _ip_address AND action_type = _action_type;
    END IF;

    -- Return success with remaining quota
    RETURN jsonb_build_object(
        'allowed', TRUE,
        'hourly_remaining', _hourly_limit - v_hourly_count - 1,
        'daily_remaining', _daily_limit - v_daily_count - 1,
        'current_hourly_count', v_hourly_count + 1,
        'current_daily_count', v_daily_count + 1
    );
END;
$function$;

-- Function to log suspicious activity (can be called from Edge Functions)
CREATE OR REPLACE FUNCTION public.log_suspicious_activity(
    _user_id UUID,
    _ip_address TEXT,
    _action_type TEXT,
    _reason TEXT,
    _severity TEXT DEFAULT 'medium',
    _request_details JSONB DEFAULT '{}'::JSONB,
    _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.suspicious_activity_log (
        user_id, ip_address, action_type, reason, severity, request_details, user_agent
    ) VALUES (
        _user_id, _ip_address, _action_type, _reason, _severity, _request_details, _user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$function$;

-- Cleanup function for old rate limit records (can be run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete records older than 7 days with no recent activity
    DELETE FROM public.api_rate_limits
    WHERE last_request_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$function$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.api_rate_limits TO authenticated;
GRANT SELECT, INSERT ON public.suspicious_activity_log TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.api_rate_limits IS 'Generic rate limiting table for all API endpoints';
COMMENT ON TABLE public.suspicious_activity_log IS 'Log of suspicious activity including rate limit violations and invalid requests';
COMMENT ON FUNCTION public.check_rate_limit IS 'Generic rate limit checker supporting both user-based and IP-based limiting';
