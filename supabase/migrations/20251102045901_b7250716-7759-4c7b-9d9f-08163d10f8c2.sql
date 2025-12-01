-- Remove old constraint that only allows text, task, file
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add new constraint with all message types including poll and gif
ALTER TABLE messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'task', 'file', 'poll', 'gif'));