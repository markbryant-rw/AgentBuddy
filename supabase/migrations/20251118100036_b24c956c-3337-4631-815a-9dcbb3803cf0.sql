-- Add RLS policies for Office Managers to manage team members in their office

-- Drop existing team_members policies to recreate them
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

-- SELECT: Users can view their own membership, teammates, and platform admins/office managers can view all
CREATE POLICY "team_members_select" ON public.team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- INSERT: Users can join, team admins can add, platform admins can add, office managers can add to their office teams
CREATE POLICY "team_members_insert" ON public.team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- UPDATE: Team admins, platform admins, and office managers can update members in their teams/office
CREATE POLICY "team_members_update" ON public.team_members 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

-- DELETE: Team admins, platform admins, and office managers can remove members
CREATE POLICY "team_members_delete" ON public.team_members 
FOR DELETE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid() AND access_level = 'admin'
  )
  OR public.has_role(auth.uid(), 'platform_admin')
  OR (
    public.has_role(auth.uid(), 'office_manager')
    AND team_id IN (
      SELECT id FROM public.teams 
      WHERE agency_id IN (
        SELECT office_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);