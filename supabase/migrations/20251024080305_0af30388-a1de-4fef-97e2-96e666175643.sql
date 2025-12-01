-- Fix friend_connections INSERT policy to allow bidirectional inserts
DROP POLICY IF EXISTS "Users can create friend connections" ON friend_connections;

CREATE POLICY "Users can create friend connections"
  ON friend_connections FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Clean up kpi_entries SELECT policies - remove old restrictive ones
DROP POLICY IF EXISTS "Users can view their own entries" ON kpi_entries;
DROP POLICY IF EXISTS "Users can view team entries" ON kpi_entries;

-- The comprehensive "Users can view friend and public stats" policy already exists from previous migration
-- It covers all cases: own entries, team members, friends, and public leaderboard participants