-- Create validation functions for data integrity

-- Function to get cross-office assignments
CREATE OR REPLACE FUNCTION get_cross_office_assignments()
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_office_id UUID,
  user_office_name TEXT,
  team_id UUID,
  team_name TEXT,
  team_office_id UUID,
  team_office_name TEXT
) 
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
    AND p.office_id != t.agency_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate office-team consistency
CREATE OR REPLACE FUNCTION validate_office_team_consistency()
RETURNS TRIGGER
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
$$ LANGUAGE plpgsql;

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

-- Function to get orphaned team members
CREATE OR REPLACE FUNCTION get_orphaned_team_members()
RETURNS TABLE(
  team_member_id UUID,
  user_id UUID,
  user_name TEXT,
  team_id UUID,
  team_name TEXT,
  issue TEXT
)
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
$$ LANGUAGE plpgsql;

-- Function to check data health
CREATE OR REPLACE FUNCTION check_data_health()
RETURNS TABLE(
  check_name TEXT,
  issue_count BIGINT,
  severity TEXT,
  details JSONB
)
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
  
  -- Users with primary_team_id but no team membership
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
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );
END;
$$ LANGUAGE plpgsql;