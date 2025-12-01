-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- Problem: Policies that query team_members inside team_members policy create infinite loops
-- Solution: Use profiles.primary_team_id for team membership checks
-- ============================================

-- Fix team_members policy (main culprit)
DROP POLICY IF EXISTS team_members_select ON team_members;

CREATE POLICY team_members_select ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix goals policy
DROP POLICY IF EXISTS "Users can view team goals" ON goals;

CREATE POLICY "Users can view team goals" ON goals
FOR SELECT TO authenticated
USING (
  (goal_type = 'team'::goal_type) 
  AND team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Fix service_providers policies
DROP POLICY IF EXISTS "Team members can view team providers" ON service_providers;

CREATE POLICY "Team members can view team providers" ON service_providers
FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT primary_team_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
  OR created_by = auth.uid()
  OR visibility_level = 'public'
);