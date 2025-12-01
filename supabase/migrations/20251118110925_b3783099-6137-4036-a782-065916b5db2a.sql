-- Create security definer function to check team membership WITHOUT triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
    AND team_id = _team_id
  );
$$;

-- Drop and recreate team_members policies using the security definer function
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

-- SELECT: Users can see their own membership OR memberships of teams they belong to
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()  -- Own membership (no recursion)
  OR public.is_team_member(auth.uid(), team_id)  -- Team membership check via security definer
  OR has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- INSERT: Admins, office managers, and team leaders can add members
CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
  OR has_role(auth.uid(), 'team_leader')
);

-- UPDATE: Admins and office managers can update memberships
CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);

-- DELETE: Admins and office managers can remove members
CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin')
  OR has_role(auth.uid(), 'office_manager')
);