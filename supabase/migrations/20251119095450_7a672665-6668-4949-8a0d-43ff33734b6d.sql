
-- Update check_data_health function to exclude inactive users from inconsistent primary team check
CREATE OR REPLACE FUNCTION public.check_data_health()
RETURNS TABLE(check_name text, issue_count bigint, severity text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;
