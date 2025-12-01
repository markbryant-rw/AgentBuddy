-- Fix ambiguous column reference in calculate_subtask_progress function
DROP FUNCTION IF EXISTS calculate_subtask_progress(UUID);

CREATE OR REPLACE FUNCTION calculate_subtask_progress(p_parent_task_id UUID)
RETURNS TABLE(completed INTEGER, total INTEGER, percentage INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE tasks.completed = true)::INTEGER as completed,
    COUNT(*)::INTEGER as total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE tasks.completed = true) * 100 / COUNT(*))::INTEGER
    END as percentage
  FROM tasks
  WHERE tasks.parent_task_id = p_parent_task_id;
END;
$$ LANGUAGE plpgsql STABLE;