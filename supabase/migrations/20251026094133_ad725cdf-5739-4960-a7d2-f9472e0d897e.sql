-- Add reactions column to messages table for emoji reactions
ALTER TABLE messages 
ADD COLUMN reactions JSONB DEFAULT '[]'::jsonb;

-- Add index for faster reaction queries
CREATE INDEX idx_messages_reactions ON messages USING gin(reactions);

-- Add comment to explain structure
COMMENT ON COLUMN messages.reactions IS 'Array of reaction objects: [{"emoji": "👍", "users": ["user-id-1"]}]';