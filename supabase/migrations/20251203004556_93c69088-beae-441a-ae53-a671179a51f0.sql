-- Fix infinite recursion in team_members "Team admins" policy
-- The policy references team_members within itself, causing recursion

-- Step 1: Create a SECURITY DEFINER function to check if user is team admin
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
    AND access_level = 'admin'
  )
$$;

-- Step 2: Drop the problematic policy
DROP POLICY IF EXISTS "Team admins can manage their team members" ON team_members;

-- Step 3: Create a new policy using the SECURITY DEFINER function
CREATE POLICY "Team admins can manage their team members"
ON team_members
FOR ALL
USING (
  is_team_admin(auth.uid(), team_id)
);