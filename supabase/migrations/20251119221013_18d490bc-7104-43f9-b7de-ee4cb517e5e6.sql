-- Phase 1: Manual cleanup for Josh Smith's orphaned profile
UPDATE profiles 
SET 
  email = '47a79f65-b882-45ee-9a33-84d0a3d350c9.archived-' || extract(epoch from now())::text || '@deleted.local',
  status = 'inactive'
WHERE email = 'josh.smith@raywhite.com' 
  AND id = '47a79f65-b882-45ee-9a33-84d0a3d350c9';

-- Phase 2: Create invitation_activity_log table
CREATE TABLE IF NOT EXISTS public.invitation_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES pending_invitations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'created', 'sent', 'reminder_sent', 'accepted', 'expired', 'revoked', 'failed'
  actor_id UUID REFERENCES profiles(id),
  recipient_email TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  office_id UUID REFERENCES agencies(id),
  error_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_activity_invitation ON invitation_activity_log(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_actor ON invitation_activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_office ON invitation_activity_log(office_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_team ON invitation_activity_log(team_id);
CREATE INDEX IF NOT EXISTS idx_invitation_activity_created ON invitation_activity_log(created_at DESC);

-- Enable RLS on invitation_activity_log
ALTER TABLE public.invitation_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Office managers can view activity for their office
CREATE POLICY "Office managers can view their office activity"
  ON public.invitation_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'office_manager'
      AND user_roles.revoked_at IS NULL
    )
    AND office_id IN (
      SELECT t.agency_id 
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- RLS Policy: Platform admins can view all activity
CREATE POLICY "Platform admins can view all activity"
  ON public.invitation_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'platform_admin'
      AND user_roles.revoked_at IS NULL
    )
  );

-- Phase 3: Enhanced backend health check function
CREATE OR REPLACE FUNCTION public.check_backend_health()
RETURNS TABLE(
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
  -- Check 1: Orphaned profiles (profiles without auth users)
  RETURN QUERY
  SELECT 
    'orphaned_profiles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'profile_id', p.id,
      'email', p.email,
      'created_at', p.created_at,
      'status', p.status
    )), '[]'::jsonb)
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p.id
  ) AND p.status != 'inactive';

  -- Check 2: Duplicate emails
  RETURN QUERY
  SELECT 
    'duplicate_emails'::TEXT,
    COUNT(DISTINCT email)::BIGINT,
    CASE WHEN COUNT(DISTINCT email) > 0 THEN 'critical' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'email', email,
      'count', count,
      'profile_ids', profile_ids
    )), '[]'::jsonb)
  FROM (
    SELECT 
      email,
      COUNT(*) as count,
      array_agg(id) as profile_ids
    FROM profiles
    WHERE status != 'inactive'
    GROUP BY email
    HAVING COUNT(*) > 1
  ) dupes;

  -- Check 3: Invalid invitations (non-existent teams/offices)
  RETURN QUERY
  SELECT
    'invalid_invitations'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', pi.id,
      'email', pi.email,
      'team_id', pi.team_id,
      'office_id', pi.office_id,
      'issue', 
        CASE 
          WHEN pi.team_id IS NOT NULL AND t.id IS NULL THEN 'team_not_found'
          WHEN pi.office_id IS NOT NULL AND a.id IS NULL THEN 'office_not_found'
        END
    )), '[]'::jsonb)
  FROM pending_invitations pi
  LEFT JOIN teams t ON t.id = pi.team_id
  LEFT JOIN agencies a ON a.id = pi.office_id
  WHERE pi.status = 'pending'
    AND (
      (pi.team_id IS NOT NULL AND t.id IS NULL) OR
      (pi.office_id IS NOT NULL AND a.id IS NULL)
    );

  -- Check 4: Users without roles
  RETURN QUERY
  SELECT
    'users_without_roles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'full_name', p.full_name
    )), '[]'::jsonb)
  FROM profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id AND ur.revoked_at IS NULL
    );

  -- Check 5: Expired pending invitations
  RETURN QUERY
  SELECT
    'expired_invitations'::TEXT,
    COUNT(*)::BIGINT,
    'info'::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', id,
      'email', email,
      'expires_at', expires_at
    )), '[]'::jsonb)
  FROM pending_invitations
  WHERE status = 'pending'
    AND expires_at < NOW();

  -- Check 6: Cross-office assignments
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'critical'
      ELSE 'ok'
    END::TEXT as severity,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', coa.user_id,
        'user_name', coa.user_name,
        'user_office', coa.user_office_name,
        'team_name', coa.team_name,
        'team_office', coa.team_office_name
      )
    ), '[]'::jsonb) as details
  FROM get_cross_office_assignments() coa;
  
  -- Check 7: Orphaned team members
  RETURN QUERY
  SELECT 
    'orphaned_team_members'::TEXT as check_name,
    COUNT(*)::BIGINT as issue_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 'warning'
      ELSE 'ok'
    END::TEXT as severity,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'user_id', otm.user_id,
        'user_name', otm.user_name,
        'team_name', otm.team_name,
        'issue', otm.issue
      )
    ), '[]'::jsonb) as details
  FROM get_orphaned_team_members() otm;
END;
$$;

-- Phase 4: Preventive trigger to avoid orphaned profiles
CREATE OR REPLACE FUNCTION prevent_orphaned_profiles()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a profile is created, ensure auth user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    RAISE EXCEPTION 'Cannot create profile without corresponding auth user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_auth_user_exists ON profiles;
CREATE TRIGGER check_auth_user_exists
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphaned_profiles();