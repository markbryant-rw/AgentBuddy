-- Remove duplicate bidirectional friend connections
-- Keep only the row where user_id < friend_id (ensures one direction only)
DELETE FROM friend_connections fc1
WHERE EXISTS (
  SELECT 1 FROM friend_connections fc2
  WHERE fc1.user_id = fc2.friend_id
    AND fc1.friend_id = fc2.user_id
    AND fc1.user_id > fc1.friend_id
    AND fc1.accepted = fc2.accepted
);

-- Add a check constraint to prevent future bidirectional duplicates
-- This ensures user_id is always "less than" friend_id
ALTER TABLE friend_connections
ADD CONSTRAINT friend_connections_direction_check
CHECK (user_id < friend_id);