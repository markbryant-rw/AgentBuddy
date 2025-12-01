-- PHASE 1: IMMEDIATE DATA CLEANUP

-- 1.1 Clean Stale Pending Invitations
UPDATE pending_invitations
SET 
  status = 'accepted',
  accepted_at = NOW()
WHERE 
  status = 'pending' 
  AND email IN (
    SELECT email FROM profiles WHERE status != 'inactive'
  );

-- Log the cleanup
INSERT INTO audit_logs (user_id, action, details)
SELECT 
  p.id,
  'invitation_cleanup',
  jsonb_build_object(
    'email', p.email,
    'reason', 'Retroactive cleanup of stale pending invitation',
    'invitation_id', pi.id
  )
FROM profiles p
INNER JOIN pending_invitations pi ON p.email = pi.email
WHERE pi.status = 'accepted' AND pi.accepted_at >= NOW() - INTERVAL '5 minutes';

-- 1.2 Move Users from Ray White New Lynn to Ray White Austar
UPDATE profiles
SET 
  office_id = '02148856-7fb7-4405-98c9-23d51bcde479',
  updated_at = NOW()
WHERE email IN ('test-user-001@team-os.app', 'test-user-002@team-os.app');

-- Log the office transfer
INSERT INTO audit_logs (user_id, action, details)
SELECT 
  id,
  'office_transfer',
  jsonb_build_object(
    'from_office', 'Ray White New Lynn',
    'to_office', 'Ray White Austar',
    'reason', 'Office consolidation - data cleanup'
  )
FROM profiles
WHERE email IN ('test-user-001@team-os.app', 'test-user-002@team-os.app');

-- 1.3 Add Database Constraint for Email Uniqueness
DO $$
BEGIN
  -- Check for duplicate emails
  IF EXISTS (
    SELECT email, COUNT(*) 
    FROM profiles 
    GROUP BY email 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate emails found in profiles table. Clean up before adding constraint.';
  END IF;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- PHASE 3: INVITATION LIFECYCLE MANAGEMENT

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to auto-expire old pending invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pending_invitations
  SET status = 'expired'
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Function to archive old accepted/expired invitations
CREATE OR REPLACE FUNCTION archive_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete accepted invitations older than 90 days
  DELETE FROM pending_invitations
  WHERE 
    status IN ('accepted', 'expired')
    AND (accepted_at < NOW() - INTERVAL '90 days' OR expires_at < NOW() - INTERVAL '90 days');
    
  -- Log the cleanup
  INSERT INTO audit_logs (action, details)
  VALUES (
    'invitation_cleanup',
    jsonb_build_object(
      'cleaned_at', NOW(),
      'reason', 'Automated 90-day cleanup of old invitations'
    )
  );
END;
$$;

-- Create scheduled jobs
SELECT cron.schedule(
  'expire-old-invitations',
  '0 * * * *',  -- Every hour
  $$SELECT expire_old_invitations()$$
);

SELECT cron.schedule(
  'archive-old-invitations',
  '0 2 * * 0',  -- Weekly on Sundays at 2 AM
  $$SELECT archive_old_invitations()$$
);

-- PHASE 4: REFERENTIAL INTEGRITY CONSTRAINTS

-- Function to validate office-team consistency
CREATE OR REPLACE FUNCTION validate_office_team_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_office_id UUID;
  team_office_id UUID;
BEGIN
  -- For team_members table
  IF TG_TABLE_NAME = 'team_members' THEN
    -- Get user's office
    SELECT office_id INTO user_office_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.team_id;
    
    -- Validate match (allow NULL office_id for flexibility)
    IF user_office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND user_office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot assign user to team from different office. User office: %, Team office: %', 
        user_office_id, team_office_id;
    END IF;
  END IF;
  
  -- For profiles table (when primary_team_id is updated)
  IF TG_TABLE_NAME = 'profiles' AND NEW.primary_team_id IS NOT NULL THEN
    -- Get team's office
    SELECT agency_id INTO team_office_id
    FROM teams
    WHERE id = NEW.primary_team_id;
    
    -- Validate match
    IF NEW.office_id IS NOT NULL 
       AND team_office_id IS NOT NULL 
       AND NEW.office_id != team_office_id THEN
      RAISE EXCEPTION 'Cannot set primary team from different office. User office: %, Team office: %', 
        NEW.office_id, team_office_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS validate_team_member_office ON team_members;
CREATE TRIGGER validate_team_member_office
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

DROP TRIGGER IF EXISTS validate_profile_team_office ON profiles;
CREATE TRIGGER validate_profile_team_office
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_office_team_consistency();

-- Function to check for cross-office assignments
CREATE OR REPLACE FUNCTION get_cross_office_assignments()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_office_id UUID,
  user_office_name TEXT,
  team_id UUID,
  team_name TEXT,
  team_office_id UUID,
  team_office_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to get orphaned team members
CREATE OR REPLACE FUNCTION get_orphaned_team_members()
RETURNS TABLE (
  team_member_id UUID,
  user_id UUID,
  user_name TEXT,
  team_id UUID,
  team_name TEXT,
  issue TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Team members where user doesn't exist
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
  
  -- Team members where team doesn't exist
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
$$;

-- PHASE 5: SCHEDULED MONITORING & ALERTS

-- Comprehensive data health check function
CREATE OR REPLACE FUNCTION check_data_health()
RETURNS TABLE (
  check_name TEXT,
  issue_count BIGINT,
  severity TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cross-office assignments
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
  
  -- Orphaned team members
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
  
  -- Users with primary_team_id but no team membership (exclude inactive users)
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
$$;

-- Daily health check function
CREATE OR REPLACE FUNCTION run_daily_data_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  health_report JSONB;
  critical_issues INTEGER;
BEGIN
  -- Run health check
  SELECT jsonb_agg(row_to_json(t.*)) INTO health_report
  FROM check_data_health() t;
  
  -- Count critical issues
  SELECT COUNT(*) INTO critical_issues
  FROM check_data_health()
  WHERE severity = 'critical' AND issue_count > 0;
  
  -- Log the health check
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
$$;

-- Schedule daily health check at 6 AM
SELECT cron.schedule(
  'daily-data-health-check',
  '0 6 * * *',
  $$SELECT run_daily_data_health_check()$$
);

-- PHASE 7: SOFT DELETE ENHANCEMENTS

-- Function to archive data for long-term inactive users
CREATE OR REPLACE FUNCTION archive_inactive_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- After 12 months: Remove avatars for inactive users
  UPDATE profiles
  SET avatar_url = NULL
  WHERE status = 'inactive'
    AND updated_at < NOW() - INTERVAL '12 months'
    AND avatar_url IS NOT NULL;
    
  -- Log the archival
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
$$;

-- Run monthly on the 1st at 3 AM
SELECT cron.schedule(
  'archive-inactive-user-data',
  '0 3 1 * *',
  $$SELECT archive_inactive_user_data()$$
);