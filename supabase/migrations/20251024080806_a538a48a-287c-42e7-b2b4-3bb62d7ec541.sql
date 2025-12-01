-- Add RLS policy to allow users to view friend profiles
CREATE POLICY "Users can view friend profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT 
        CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
      FROM friend_connections fc
      WHERE (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
        AND fc.accepted = true
    )
  );