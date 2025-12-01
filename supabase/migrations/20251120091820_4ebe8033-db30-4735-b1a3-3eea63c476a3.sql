-- Add office filtering to detect_team_assignment_issues function
CREATE OR REPLACE FUNCTION public.detect_team_assignment_issues(p_office_id UUID DEFAULT NULL)
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  user_email TEXT,
  primary_team_id UUID,
  team_name TEXT,
  description TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  -- Issue 1: Users with primary_team_id but no team_members entry
  RETURN QUERY
  SELECT 
    'missing_team_membership'::TEXT,
    p.id,
    p.email,
    p.primary_team_id,
    t.name,
    'User has a primary team set but is not a member of that team'::TEXT
  FROM profiles p
  JOIN teams t ON p.primary_team_id = t.id
  WHERE p.primary_team_id IS NOT NULL
    AND p.status = 'active'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = p.id AND tm.team_id = p.primary_team_id
    );

  -- Issue 2: Users with team_members entry but no primary_team_id
  RETURN QUERY
  SELECT 
    'missing_primary_team'::TEXT,
    p.id,
    p.email,
    tm.team_id,
    t.name,
    'User is a team member but has no primary team set'::TEXT
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  JOIN teams t ON tm.team_id = t.id
  WHERE p.primary_team_id IS NULL
    AND p.status = 'active'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id);

  -- Issue 3: Accepted invitations but user not in team
  RETURN QUERY
  SELECT 
    'invitation_mismatch'::TEXT,
    auth.users.id,
    pi.email,
    pi.team_id,
    t.name,
    'User accepted invitation but is not in the team'::TEXT
  FROM pending_invitations pi
  JOIN auth.users ON auth.users.email = pi.email
  JOIN teams t ON pi.team_id = t.id
  WHERE pi.status = 'accepted'
    AND (p_office_id IS NULL OR t.agency_id = p_office_id)
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = auth.users.id AND tm.team_id = pi.team_id
    );
END;
$$;

-- Add office filtering to auto_repair_team_assignments function
CREATE OR REPLACE FUNCTION public.auto_repair_team_assignments(p_office_id UUID DEFAULT NULL)
RETURNS TABLE (
  repaired_count INTEGER,
  details JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_repaired_count INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
  v_issue RECORD;
BEGIN
  -- Repair missing team memberships
  FOR v_issue IN 
    SELECT * FROM detect_team_assignment_issues(p_office_id)
    WHERE issue_type = 'missing_team_membership'
  LOOP
    INSERT INTO team_members (user_id, team_id, access_level)
    VALUES (v_issue.user_id, v_issue.primary_team_id, 'member')
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    v_repaired_count := v_repaired_count + 1;
    v_details := v_details || jsonb_build_object(
      'issue_type', v_issue.issue_type,
      'user_email', v_issue.user_email,
      'team_name', v_issue.team_name,
      'action', 'Added team membership'
    );
  END LOOP;

  -- Repair missing primary_team_id
  FOR v_issue IN 
    SELECT * FROM detect_team_assignment_issues(p_office_id)
    WHERE issue_type = 'missing_primary_team'
  LOOP
    UPDATE profiles
    SET primary_team_id = v_issue.primary_team_id
    WHERE id = v_issue.user_id;
    
    v_repaired_count := v_repaired_count + 1;
    v_details := v_details || jsonb_build_object(
      'issue_type', v_issue.issue_type,
      'user_email', v_issue.user_email,
      'team_name', v_issue.team_name,
      'action', 'Set primary team'
    );
  END LOOP;

  RETURN QUERY SELECT v_repaired_count, v_details;
END;
$$;