-- Add description column to conversations table for group/channel explanations
ALTER TABLE conversations 
ADD COLUMN description text;

-- Add comment for documentation
COMMENT ON COLUMN conversations.description IS 'Optional description/subtitle explaining the purpose of the group or channel';