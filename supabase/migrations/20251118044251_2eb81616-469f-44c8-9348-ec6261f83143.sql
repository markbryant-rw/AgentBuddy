-- Add RLS policies for team_members table
DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;
CREATE POLICY "Users can view own team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Platform admins can view all team memberships" ON public.team_members;
CREATE POLICY "Platform admins can view all team memberships"
ON public.team_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Add RLS policies for teams table
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
CREATE POLICY "Users can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = teams.id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Platform admins can view all teams" ON public.teams;
CREATE POLICY "Platform admins can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));