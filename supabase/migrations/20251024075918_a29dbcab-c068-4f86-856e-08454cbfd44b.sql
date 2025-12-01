-- Fix the lookup_profile_by_invite_code function to properly alias columns
CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT profiles.id AS user_id, profiles.full_name, profiles.email 
  FROM profiles 
  WHERE profiles.invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for friends and public leaderboard participants
CREATE POLICY "Users can view friend and public stats"
  ON kpi_entries FOR SELECT
  USING (
    -- Own entries
    auth.uid() = user_id
    OR
    -- Team members
    EXISTS (
      SELECT 1 FROM team_members tm1
      WHERE tm1.user_id = auth.uid()
      AND tm1.team_id IN (
        SELECT tm2.team_id FROM team_members tm2
        WHERE tm2.user_id = kpi_entries.user_id
      )
    )
    OR
    -- Friends' entries
    EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND (
        (fc.user_id = auth.uid() AND fc.friend_id = kpi_entries.user_id)
        OR
        (fc.friend_id = auth.uid() AND fc.user_id = kpi_entries.user_id)
      )
    )
    OR
    -- Public leaderboard participants (opt-in by default)
    (
      EXISTS (
        SELECT 1 FROM user_preferences up
        WHERE up.user_id = kpi_entries.user_id
        AND up.leaderboard_participation = true
      )
      OR NOT EXISTS (
        SELECT 1 FROM user_preferences up
        WHERE up.user_id = kpi_entries.user_id
      )
    )
  );