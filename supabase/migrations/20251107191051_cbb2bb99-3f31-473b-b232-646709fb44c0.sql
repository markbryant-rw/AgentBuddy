-- Add daily task fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS size_category TEXT CHECK (size_category IN ('big', 'medium', 'little')),
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS daily_position INTEGER;

-- Add index for scheduled_date queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Add index for daily task queries
CREATE INDEX IF NOT EXISTS idx_tasks_daily ON tasks(team_id, scheduled_date, size_category) WHERE scheduled_date IS NOT NULL;