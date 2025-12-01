-- Add INSERT policy for teams table
-- Platform admins can create teams anywhere
CREATE POLICY "Platform admins can insert teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Office managers can create teams in their office
CREATE POLICY "Office managers can insert teams in their office"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'office_manager')
  AND agency_id IN (
    SELECT office_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Add UPDATE policy for teams table
-- Platform admins can update all teams
CREATE POLICY "Platform admins can update teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'));

-- Office managers can update teams in their office
CREATE POLICY "Office managers can update their office teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'office_manager')
  AND agency_id IN (
    SELECT office_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Team admins can update their own team details
CREATE POLICY "Team admins can update their team"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid() 
    AND access_level = 'admin'
  )
);

-- Add DELETE/ARCHIVE policy for teams table
-- Platform admins can archive teams
CREATE POLICY "Platform admins can archive teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'platform_admin')
  AND is_archived = false
)
WITH CHECK (
  public.has_role(auth.uid(), 'platform_admin')
);