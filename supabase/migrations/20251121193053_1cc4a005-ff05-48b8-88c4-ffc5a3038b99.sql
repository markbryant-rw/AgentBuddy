-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 3: Enable RLS and fix remaining functions
-- =============================================================================

-- Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- Continue adding SET search_path to remaining functions
CREATE OR REPLACE FUNCTION public.get_cross_office_assignments()
RETURNS TABLE(user_id uuid, user_name text, user_office_id uuid, user_office_name text, team_id uuid, team_name text, team_office_id uuid, team_office_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id
    AND p.status != 'inactive';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_orphaned_team_members()
RETURNS TABLE(team_member_id uuid, user_id uuid, user_name text, team_id uuid, team_name text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    NULL::TEXT as user_name,
    tm.team_id,
    t.name as team_name,
    'User does not exist' as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  INNER JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL
  
  UNION ALL
  
  SELECT 
    tm.id as team_member_id,
    tm.user_id,
    p.full_name as user_name,
    tm.team_id,
    NULL::TEXT as team_name,
    'Team does not exist' as issue
  FROM team_members tm
  INNER JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE t.id IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_users_without_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, office_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.office_id,
    p.created_at
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
        AND ur.revoked_at IS NULL
    )
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_data_health()
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ) as details
  FROM get_cross_office_assignments() coa;
  
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ) as details
  FROM get_orphaned_team_members() otm;
  
  RETURN QUERY
  SELECT 
    'inconsistent_primary_team'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    'warning'::TEXT as severity,
    jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'user_name', p.full_name,
        'primary_team_id', p.primary_team_id
      )
    ) as details
  FROM profiles p
  WHERE p.primary_team_id IS NOT NULL
    AND p.status != 'inactive'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.run_daily_data_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  health_report JSONB;
  critical_issues INTEGER;
BEGIN
  SELECT jsonb_agg(row_to_json(t.*)) INTO health_report
  FROM check_data_health() t;
  
  SELECT COUNT(*) INTO critical_issues
  FROM check_data_health()
  WHERE severity = 'critical' AND issue_count > 0;
  
  INSERT INTO audit_logs (action, details)
  VALUES (
    'daily_health_check',
    jsonb_build_object(
      'checked_at', NOW(),
      'report', health_report,
      'critical_issues', critical_issues
    )
  );
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

CREATE OR REPLACE FUNCTION public.check_password_reset_rate_limit(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  DELETE FROM password_reset_rate_limits 
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  SELECT attempt_count, window_start 
  INTO v_count, v_window_start
  FROM password_reset_rate_limits
  WHERE email = p_email
  AND window_start > NOW() - INTERVAL '1 hour';
  
  IF v_count IS NULL THEN
    INSERT INTO password_reset_rate_limits (email, attempt_count)
    VALUES (p_email, 1);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts_remaining', 9
    );
  END IF;
  
  IF v_count >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', 'Too many password reset attempts. Please try again in an hour.',
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 hour' - NOW()))::INTEGER
    );
  END IF;
  
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
$function$;

CREATE OR REPLACE FUNCTION public.record_health_metric(p_metric_type text, p_metric_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO system_health_metrics (metric_type, metric_value)
  VALUES (p_metric_type, p_metric_value);
  
  DELETE FROM system_health_metrics
  WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.module_usage_stats (user_id, module_id, visit_count, last_visited_at)
  VALUES (p_user_id, p_module_id, 1, now())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    visit_count = public.module_usage_stats.visit_count + 1,
    last_visited_at = now();
END;
$function$;