-- Add is_starred column to friend_connections table
ALTER TABLE friend_connections
ADD COLUMN is_starred boolean NOT NULL DEFAULT false;

-- Create index for performance when filtering starred friends
CREATE INDEX idx_friend_connections_starred 
ON friend_connections(user_id, is_starred) 
WHERE is_starred = true;