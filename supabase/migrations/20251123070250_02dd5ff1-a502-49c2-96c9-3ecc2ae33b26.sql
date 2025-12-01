-- Update service_providers RLS to be office-scoped only
-- Drop existing team-scoped policies
DROP POLICY IF EXISTS "Team members can view their team's providers" ON public.service_providers;
DROP POLICY IF EXISTS "Users can view providers they created" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can insert providers" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can update their team's providers" ON public.service_providers;
DROP POLICY IF EXISTS "Team members can delete their team's providers" ON public.service_providers;

-- Create office-scoped policies for service_providers
CREATE POLICY "Office members can view office providers" 
ON public.service_providers
FOR SELECT 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can create providers" 
ON public.service_providers
FOR INSERT 
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY "Office members can update office providers" 
ON public.service_providers
FOR UPDATE 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can delete office providers" 
ON public.service_providers
FOR DELETE 
TO authenticated
USING (
  team_id IN (
    SELECT t.id
    FROM teams t
    WHERE t.agency_id IN (
      SELECT t2.agency_id
      FROM teams t2
      JOIN team_members tm ON t2.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);