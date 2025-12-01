-- Drop the old restrictive team-only policy
DROP POLICY IF EXISTS "Users can view teammate profiles" ON profiles;

-- Create new policy allowing users to view profiles in the same agency/office
CREATE POLICY "Users can view office colleague profiles" ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT tm2.user_id
      FROM team_members tm1
      JOIN teams t1 ON tm1.team_id = t1.id
      JOIN teams t2 ON t1.agency_id = t2.agency_id
      JOIN team_members tm2 ON t2.id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
        AND t1.agency_id IS NOT NULL
    )
  );