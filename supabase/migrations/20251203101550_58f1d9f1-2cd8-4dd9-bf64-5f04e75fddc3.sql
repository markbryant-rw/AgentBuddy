-- Update RLS policy to allow team members to update team appraisals
DROP POLICY IF EXISTS "Users can update own appraisals" ON logged_appraisals;

CREATE POLICY "Team members can update team appraisals" ON logged_appraisals
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );