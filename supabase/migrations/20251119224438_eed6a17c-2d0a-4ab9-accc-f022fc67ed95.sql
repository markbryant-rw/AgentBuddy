
-- Phase 1: Database-Level Integrity Constraints

-- Function to ensure primary_team_id has corresponding team_members entry
CREATE OR REPLACE FUNCTION check_primary_team_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If primary_team_id is set, ensure a team_members entry exists
  IF NEW.primary_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = NEW.id 
      AND team_id = NEW.primary_team_id
    ) THEN
      RAISE EXCEPTION 'Cannot set primary_team_id without corresponding team_members entry. User must be added to team first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for primary_team_id validation
DROP TRIGGER IF EXISTS ensure_primary_team_membership ON profiles;
CREATE TRIGGER ensure_primary_team_membership
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.primary_team_id IS DISTINCT FROM NEW.primary_team_id)
  EXECUTE FUNCTION check_primary_team_membership();

-- Function to validate invitation team assignment
CREATE OR REPLACE FUNCTION validate_invitation_team()
RETURNS TRIGGER AS $$
BEGIN
  -- If team_id is set, ensure it exists and matches the office
  IF NEW.team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM teams 
      WHERE id = NEW.team_id 
      AND agency_id = NEW.office_id
    ) THEN
      RAISE EXCEPTION 'Invalid team_id: team does not exist or does not belong to the specified office';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invitation team validation
DROP TRIGGER IF EXISTS validate_invitation_team_assignment ON pending_invitations;
CREATE TRIGGER validate_invitation_team_assignment
  BEFORE INSERT OR UPDATE ON pending_invitations
  FOR EACH ROW
  EXECUTE FUNCTION validate_invitation_team();

-- Add unique constraint on team_members (prevent duplicate memberships)
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS unique_user_team;

ALTER TABLE team_members 
ADD CONSTRAINT unique_user_team 
UNIQUE (user_id, team_id);

-- Phase 4: Automatic Data Repair System

-- Function to detect team assignment issues
CREATE OR REPLACE FUNCTION detect_team_assignment_issues()
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  user_email TEXT,
  primary_team_id UUID,
  team_name TEXT,
  description TEXT
) AS $$
BEGIN
  -- Find users with primary_team_id but no team_members entry
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has primary_team_id but no team_members entry'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = p.primary_team_id
    );
    
  -- Find users with team_members but no primary_team_id
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    tm.user_id,
    p.email,
    tm.team_id,
    t.name,
    'User is team member but has no primary_team_id'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND tm.access_level IN ('admin', 'edit');
    
  -- Find accepted invitations with team_id but user not in team
  RETURN QUERY
  SELECT 
    'invitation_team_mismatch'::TEXT,
    p.id,
    i.email,
    i.team_id,
    t.name,
    'Invitation was accepted but team membership was not created'::TEXT
  FROM pending_invitations i
  JOIN profiles p ON p.email = i.email
  LEFT JOIN teams t ON i.team_id = t.id
  WHERE i.status = 'accepted'
    AND i.team_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id 
      AND tm.team_id = i.team_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-repair team assignments
CREATE OR REPLACE FUNCTION auto_repair_team_assignments()
RETURNS TABLE (
  repaired_count INTEGER,
  repair_log JSONB
) AS $$
DECLARE
  repair_results JSONB := '[]'::JSONB;
  repairs INTEGER := 0;
  issue RECORD;
BEGIN
  -- Fix missing team memberships (high priority)
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_team_membership'
  LOOP
    -- Create missing team_members entry
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (issue.user_id, issue.primary_team_id, 'edit')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    -- Log repair
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_team_membership', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'created_team_membership'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'created_team_membership'
    );
  END LOOP;
  
  -- Fix missing primary_team_id (medium priority)
  FOR issue IN 
    SELECT * FROM detect_team_assignment_issues() 
    WHERE issue_type = 'missing_primary_team'
  LOOP
    -- Set primary_team_id to their team
    UPDATE profiles
    SET primary_team_id = issue.primary_team_id
    WHERE id = issue.user_id;
    
    -- Log repair
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (issue.user_id, 'auto_repair_primary_team', jsonb_build_object(
      'team_id', issue.primary_team_id,
      'team_name', issue.team_name,
      'issue', issue.description,
      'repair_type', 'set_primary_team'
    ));
    
    repairs := repairs + 1;
    repair_results := repair_results || jsonb_build_object(
      'user_id', issue.user_id,
      'user_email', issue.user_email,
      'team_name', issue.team_name,
      'action', 'set_primary_team'
    );
  END LOOP;
  
  RETURN QUERY SELECT repairs, repair_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION detect_team_assignment_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_repair_team_assignments() TO authenticated;
