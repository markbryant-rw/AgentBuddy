-- Phase 1: Fix RLS Recursion on team_members
-- Drop existing problematic policies
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- Create simplified non-recursive policies
-- 1. Users can see their own memberships (direct check, no recursion)
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership
  OR team_id IN (
    -- Teams where user's primary_team_id matches (no recursion)
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid() AND primary_team_id IS NOT NULL
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- 2. Insert policy - system can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- 3. Update policy - admins and managers only
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- 4. Delete policy - admins and managers only
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);