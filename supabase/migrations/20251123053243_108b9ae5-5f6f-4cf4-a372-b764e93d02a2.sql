-- Drop existing SELECT policy for service_providers
DROP POLICY IF EXISTS "service_providers_select" ON public.service_providers;

-- Create new comprehensive SELECT policy with proper visibility level support
CREATE POLICY "service_providers_select" ON public.service_providers
FOR SELECT USING (
  -- Public providers are visible to everyone
  visibility_level = 'public'
  OR
  -- Office-level providers are visible to all users in teams within the same office
  (
    visibility_level = 'office' 
    AND EXISTS (
      SELECT 1 
      FROM teams provider_team
      JOIN teams user_team ON provider_team.agency_id = user_team.agency_id
      WHERE provider_team.id = service_providers.team_id
        AND user_team.id IN (SELECT get_user_team_ids(auth.uid()))
    )
  )
  OR
  -- Team-level providers are visible only to team members
  (
    visibility_level = 'team'
    AND team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
  OR
  -- Private providers are visible only to creator
  (
    visibility_level = 'private'
    AND created_by = auth.uid()
  )
);