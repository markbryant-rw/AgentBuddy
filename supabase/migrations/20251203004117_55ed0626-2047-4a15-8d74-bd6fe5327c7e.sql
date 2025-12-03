-- Fix infinite recursion in team_members RLS policy
-- The issue: team_members policy queries teams, which joins team_members, causing recursion

-- Step 1: Create SECURITY DEFINER functions to bypass RLS recursion

-- Get team IDs for an agency (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_agency_team_ids(_agency_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teams WHERE agency_id = _agency_id
$$;

-- Get team IDs user can access via their agency or office manager assignments
CREATE OR REPLACE FUNCTION public.get_user_accessible_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Teams in user's agency
  SELECT id FROM teams 
  WHERE agency_id = (SELECT office_id FROM profiles WHERE id = _user_id)
  UNION
  -- Teams in agencies user manages
  SELECT t.id FROM teams t
  INNER JOIN office_manager_assignments oma ON t.agency_id = oma.agency_id
  WHERE oma.user_id = _user_id
$$;

-- Step 2: Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view team members in their agency" ON team_members;

-- Step 3: Create new policy using SECURITY DEFINER function
CREATE POLICY "Users can view team members in their agency"
ON team_members
FOR SELECT
USING (
  team_id IN (SELECT get_user_accessible_team_ids(auth.uid()))
);

-- Also fix the "Team admins can manage their team members" policy if it has recursion
DROP POLICY IF EXISTS "Team admins can manage their team members" ON team_members;

CREATE POLICY "Team admins can manage their team members"
ON team_members
FOR ALL
USING (
  -- Use a simpler check that doesn't recurse
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_members.team_id
    AND tm.user_id = auth.uid()
    AND tm.access_level = 'admin'
  )
);