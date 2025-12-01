-- Phase 1: Security Hardening - Database Changes
-- Add idempotency and token security columns

-- Add idempotency_key to pending_invitations
ALTER TABLE pending_invitations 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS token_hash TEXT,
ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON pending_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_idempotency ON pending_invitations(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_invitations_email_status ON pending_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);

-- Add rate limiting table for password resets
CREATE TABLE IF NOT EXISTS password_reset_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_rate_limits(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_window ON password_reset_rate_limits(window_start);

-- Add system health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_type_time ON system_health_metrics(metric_type, recorded_at DESC);

-- Database trigger to prevent duplicate team memberships
CREATE OR REPLACE FUNCTION prevent_duplicate_team_membership()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = NEW.user_id 
    AND team_id = NEW.team_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'User already member of this team';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_duplicate_membership ON team_members;
CREATE TRIGGER check_duplicate_membership
BEFORE INSERT OR UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_team_membership();

-- Function to check password reset rate limit (10 per hour per email)
CREATE OR REPLACE FUNCTION check_password_reset_rate_limit(p_email TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Clean up old entries (older than 1 hour)
  DELETE FROM password_reset_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Get current count for this email
  SELECT attempt_count, window_start 
  INTO v_count, v_window_start
  FROM password_reset_rate_limits
  WHERE email = p_email
  AND window_start > NOW() - INTERVAL '1 hour';
  
  -- If no record exists, create one
  IF v_count IS NULL THEN
    INSERT INTO password_reset_rate_limits (email, attempt_count)
    VALUES (p_email, 1);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts_remaining', 9
    );
  END IF;
  
  -- Check if limit exceeded (10 per hour)
  IF v_count >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', 'Too many password reset attempts. Please try again in an hour.',
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - NOW()))::INTEGER
    );
  END IF;
  
  -- Increment counter
  UPDATE password_reset_rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW()
  WHERE email = p_email;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts_remaining', 10 - v_count - 1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record system health metrics
CREATE OR REPLACE FUNCTION record_health_metric(p_metric_type TEXT, p_metric_value JSONB)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_health_metrics (metric_type, metric_value)
  VALUES (p_metric_type, p_metric_value);
  
  -- Clean up old metrics (keep only last 30 days)
  DELETE FROM system_health_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;