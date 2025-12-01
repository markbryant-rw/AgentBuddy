
-- =====================================================
-- FIX: Infinite Recursion in team_members RLS Policies
-- =====================================================
-- Problem: Policies query team_members inside team_members policy
-- Solution: Use profiles.primary_team_id to check team membership
-- This breaks the infinite recursion loop
-- =====================================================

-- Drop all existing team_members policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Platform admins can view all team memberships" ON team_members;

-- SELECT: Users can view members of their own team
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership record
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() AND primary_team_id IS NOT NULL
  )  -- Members of user's primary team
  OR has_role(auth.uid(), 'platform_admin')  -- Platform admins see all
  OR (
    has_role(auth.uid(), 'office_manager') 
    AND team_id IN (
      SELECT id FROM teams 
      WHERE agency_id IN (
        SELECT office_id FROM profiles WHERE id = auth.uid()
      )
    )
  )  -- Office managers see their office's teams
);

-- INSERT: Team admins and office managers can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()  -- Adding self
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Members can add to their primary team
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- UPDATE: Team admins can update member access levels
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Members of primary team can update
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Team admins and office managers can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()  -- Can remove self
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND primary_team_id IS NOT NULL
  )  -- Team members can remove others
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);
