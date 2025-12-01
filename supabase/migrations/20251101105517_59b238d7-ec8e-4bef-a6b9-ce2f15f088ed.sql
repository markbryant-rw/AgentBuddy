-- Fix circular dependencies in RLS policies
-- Step 1: Recreate has_role() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 2: Fix user_roles policies (remove self-reference)
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;

-- Everyone can see their own roles (no recursion)
CREATE POLICY "user_roles_select" ON user_roles 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- Only platform admins can manage roles (using SECURITY DEFINER function)
CREATE POLICY "user_roles_insert" ON user_roles 
FOR INSERT TO authenticated 
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "user_roles_update" ON user_roles 
FOR UPDATE TO authenticated 
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "user_roles_delete" ON user_roles 
FOR DELETE TO authenticated 
USING (has_role(auth.uid(), 'platform_admin'));

-- Step 3: Fix team_members policies (use has_role instead of querying user_roles)
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_insert" ON team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_update" ON team_members 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "team_members_delete" ON team_members 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'admin')
);