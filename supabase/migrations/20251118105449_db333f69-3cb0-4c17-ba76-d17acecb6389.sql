-- =====================================================
-- EMERGENCY FIX: Restore Data Visibility
-- =====================================================
-- Problem: RLS policy on team_members uses primary_team_id which creates
--          a logic dependency that breaks when users have team memberships
--          that don't match their primary_team_id
-- Solution: Use proper existence check for team membership
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- SELECT: Users can view members of teams they belong to
-- This uses a proper EXISTS subquery that checks actual team membership
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership record
  OR EXISTS (
    -- Check if the current user is a member of the same team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'platform_admin')  -- Platform admins see all
  OR EXISTS (
    -- Office managers see their office's teams
    SELECT 1 FROM teams t
    JOIN profiles p ON p.id = auth.uid()
    WHERE t.id = team_members.team_id
    AND t.agency_id = p.office_id
    AND has_role(auth.uid(), 'office_manager')
  )
);

-- INSERT: Can add members to teams they're admin of or have appropriate role
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()  -- Adding self
  OR EXISTS (
    -- Check if inserter is admin of the target team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- UPDATE: Team admins can update member access levels
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    -- Check if updater is admin of the team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Can remove self or admins can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()  -- Can remove self
  OR EXISTS (
    -- Check if deleter is admin of the team
    SELECT 1 FROM team_members tm2 
    WHERE tm2.team_id = team_members.team_id 
    AND tm2.user_id = auth.uid()
    AND tm2.access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);