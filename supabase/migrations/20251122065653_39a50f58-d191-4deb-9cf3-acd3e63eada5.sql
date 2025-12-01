-- Phase 1: Create function to compute team access level based on app role
CREATE OR REPLACE FUNCTION compute_team_access_level(_user_id uuid, _team_id uuid)
RETURNS access_level
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_office_id uuid;
  team_office_id uuid;
  user_app_role app_role;
BEGIN
  -- Get user's office
  SELECT office_id INTO user_office_id FROM profiles WHERE id = _user_id;
  
  -- Get team's office
  SELECT agency_id INTO team_office_id FROM teams WHERE id = _team_id;
  
  -- Platform admins get admin access to all teams
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  ) THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Office managers get admin access to all teams in their office
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'office_manager'
    AND revoked_at IS NULL
  ) AND user_office_id = team_office_id THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Team leaders get admin access to their team
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role = 'team_leader'
    AND revoked_at IS NULL
  ) THEN
    RETURN 'admin'::access_level;
  END IF;
  
  -- Salespeople and assistants get view access
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id 
    AND role IN ('salesperson', 'assistant')
    AND revoked_at IS NULL
  ) THEN
    RETURN 'view'::access_level;
  END IF;
  
  -- Default to view if no role matches
  RETURN 'view'::access_level;
END;
$$;

-- Phase 2: Create trigger function to auto-set access_level
CREATE OR REPLACE FUNCTION auto_set_team_access_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute and set the access_level based on user's app role
  NEW.access_level := compute_team_access_level(NEW.user_id, NEW.team_id);
  RETURN NEW;
END;
$$;

-- Phase 3: Create trigger on team_members INSERT/UPDATE
DROP TRIGGER IF EXISTS set_team_access_level_on_insert ON team_members;
CREATE TRIGGER set_team_access_level_on_insert
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_team_access_level();

-- Phase 4: Create trigger on user_roles changes to update team_members
CREATE OR REPLACE FUNCTION sync_team_access_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user's role changes, update all their team memberships
  UPDATE team_members
  SET access_level = compute_team_access_level(
    COALESCE(NEW.user_id, OLD.user_id), 
    team_id
  )
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_team_access_on_role_change ON user_roles;
CREATE TRIGGER sync_team_access_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_access_on_role_change();

-- Phase 5: Migrate existing data - update all team_members to match their app roles
UPDATE team_members
SET access_level = compute_team_access_level(user_id, team_id);

-- Add helpful comment
COMMENT ON FUNCTION compute_team_access_level IS 'Automatically determines team access level based on user app role: platform_admin/office_manager/team_leader → admin, salesperson/assistant → view';
COMMENT ON COLUMN team_members.access_level IS 'Auto-computed from user app role. Do not set manually.';