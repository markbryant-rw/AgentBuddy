-- Add urgency and importance columns to tasks table for Eisenhower matrix support
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

-- Add index for efficient filtering by urgency/importance
CREATE INDEX IF NOT EXISTS idx_tasks_urgency_importance ON tasks(is_urgent, is_important);

-- Add comments for clarity
COMMENT ON COLUMN tasks.is_urgent IS 'Task requires immediate attention';
COMMENT ON COLUMN tasks.is_important IS 'Task has significant impact/value';