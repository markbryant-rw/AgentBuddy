-- ============================================
-- FIX team_members_delete CIRCULAR REFERENCE
-- ============================================
-- Create security definer function to check admin status
-- This avoids circular reference in DELETE policy
-- ============================================

-- Create helper function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(user_id uuid, team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND access_level = 'admin'
  );
$$;

-- Update DELETE policy to use the function
DROP POLICY IF EXISTS team_members_delete ON team_members;

CREATE POLICY team_members_delete ON team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR is_team_admin(auth.uid(), team_id)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);