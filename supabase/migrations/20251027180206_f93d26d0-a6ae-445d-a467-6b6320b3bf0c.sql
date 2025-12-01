-- Phase 1: Database Schema Updates for Task Manager Transformation

-- Add subtask support to tasks table
ALTER TABLE tasks 
ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN order_position INTEGER DEFAULT 0,
ADD COLUMN transaction_id UUID;

-- Add task view mode preference to profiles
ALTER TABLE profiles 
ADD COLUMN task_view_mode TEXT DEFAULT 'simple' CHECK (task_view_mode IN ('simple', 'advanced'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(team_id, order_position);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction ON tasks(transaction_id);

-- Function to calculate subtask progress for a parent task
CREATE OR REPLACE FUNCTION calculate_subtask_progress(parent_task_id UUID)
RETURNS TABLE(completed INTEGER, total INTEGER, percentage INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE completed = true)::INTEGER as completed,
    COUNT(*)::INTEGER as total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE completed = true) * 100 / COUNT(*))::INTEGER
    END as percentage
  FROM tasks
  WHERE parent_task_id = $1;
END;
$$ LANGUAGE plpgsql STABLE;