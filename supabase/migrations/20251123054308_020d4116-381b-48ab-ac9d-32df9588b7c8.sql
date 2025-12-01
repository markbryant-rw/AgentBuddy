-- Update provider_attachments RLS to be office-scoped only
-- Drop existing team-scoped policies
DROP POLICY IF EXISTS "Team members can view attachments" ON public.provider_attachments;
DROP POLICY IF EXISTS "Team members can insert attachments" ON public.provider_attachments;
DROP POLICY IF EXISTS "Team members can delete attachments" ON public.provider_attachments;

-- Create office-scoped policies for provider_attachments
CREATE POLICY "Office members can view attachments for office providers" 
ON public.provider_attachments
FOR SELECT 
TO authenticated
USING (
  provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Office members can add attachments to office providers" 
ON public.provider_attachments
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND provider_id IN (
    SELECT sp.id
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    WHERE provider_team.agency_id IN (
      SELECT t.agency_id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their own attachments" 
ON public.provider_attachments
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);