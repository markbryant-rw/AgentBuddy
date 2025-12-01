-- Update check_backend_health function to support office-scoped filtering
-- When p_office_id is provided, only return office-relevant checks
-- When p_office_id is NULL, return all checks (Platform Admin view)

CREATE OR REPLACE FUNCTION public.check_backend_health(p_office_id uuid DEFAULT NULL)
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check 1: Orphaned profiles (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
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
  END IF;

  -- Check 2: Duplicate emails (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
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
  END IF;

  -- Check 3: Invalid invitations (filter by office when provided)
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
    AND (p_office_id IS NULL OR pi.office_id = p_office_id)
    AND (
      (pi.team_id IS NOT NULL AND t.id IS NULL) OR
      (pi.office_id IS NOT NULL AND a.id IS NULL)
    );

  -- Check 4: Users without roles (filter by office when provided)
  RETURN QUERY
  SELECT
    'users_without_roles'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) > 0 THEN 'warning' ELSE 'ok' END::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'office_id', p.office_id
    )), '[]'::jsonb)
  FROM profiles p
  WHERE p.status = 'active'
    AND (p_office_id IS NULL OR p.office_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id AND ur.revoked_at IS NULL
    );

  -- Check 5: Expired pending invitations (filter by office when provided)
  RETURN QUERY
  SELECT
    'expired_invitations'::TEXT,
    COUNT(*)::BIGINT,
    'info'::TEXT,
    COALESCE(jsonb_agg(jsonb_build_object(
      'invitation_id', id,
      'email', email,
      'expires_at', expires_at,
      'office_id', office_id
    )), '[]'::jsonb)
  FROM pending_invitations
  WHERE status = 'pending'
    AND (p_office_id IS NULL OR office_id = p_office_id)
    AND expires_at < NOW();

  -- Check 6: Cross-office assignments (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'cross_office_assignments'::TEXT,
      COUNT(*)::BIGINT,
      CASE 
        WHEN COUNT(*) > 0 THEN 'critical'
        ELSE 'ok'
      END::TEXT,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', coa.user_id,
          'user_name', coa.user_name,
          'user_office', coa.user_office_name,
          'team_name', coa.team_name,
          'team_office', coa.team_office_name
        )
      ), '[]'::jsonb)
    FROM get_cross_office_assignments() coa;
  END IF;

  -- Check 7: Orphaned team members (GLOBAL ONLY - skip when office_id provided)
  IF p_office_id IS NULL THEN
    RETURN QUERY
    SELECT 
      'orphaned_team_members'::TEXT,
      COUNT(*)::BIGINT,
      CASE 
        WHEN COUNT(*) > 0 THEN 'warning'
        ELSE 'ok'
      END::TEXT,
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', otm.user_id,
          'user_name', otm.user_name,
          'team_name', otm.team_name,
          'issue', otm.issue
        )
      ), '[]'::jsonb)
    FROM get_orphaned_team_members() otm;
  END IF;
END;
$function$;