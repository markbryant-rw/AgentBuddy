-- Fix Review RLS Policy for cross-team office members
DROP POLICY IF EXISTS "Office members can create reviews for office providers" ON provider_reviews;

CREATE POLICY "Office members can create reviews" 
ON provider_reviews
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must own the review
  auth.uid() = user_id 
  AND
  -- Provider must be in user's office
  EXISTS (
    SELECT 1
    FROM service_providers sp
    JOIN teams provider_team ON sp.team_id = provider_team.id
    JOIN teams user_team ON user_team.agency_id = provider_team.agency_id
    JOIN team_members tm ON tm.team_id = user_team.id
    WHERE sp.id = provider_id
      AND tm.user_id = auth.uid()
  )
);

-- Restrict Edit Permissions to Creator, Office Manager, or Platform Admin
DROP POLICY IF EXISTS "Office members can update office providers" ON service_providers;

CREATE POLICY "Only creator, office manager, or platform admin can update providers" 
ON service_providers
FOR UPDATE 
TO authenticated
USING (
  -- Must be the creator
  created_by = auth.uid()
  OR
  -- OR be an office manager in the same office
  (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE t.id = team_id
        AND t.agency_id IN (
          SELECT t2.agency_id
          FROM teams t2
          JOIN team_members tm2 ON t2.id = tm2.team_id
          WHERE tm2.user_id = auth.uid()
        )
    )
    AND has_role(auth.uid(), 'office_manager'::app_role)
  )
  OR
  -- OR be a platform admin
  has_role(auth.uid(), 'platform_admin'::app_role)
);