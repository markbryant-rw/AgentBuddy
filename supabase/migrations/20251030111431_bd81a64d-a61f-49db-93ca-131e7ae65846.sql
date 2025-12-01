-- Fix existing subtasks to inherit parent's list_id
UPDATE tasks
SET list_id = (
  SELECT list_id 
  FROM tasks AS parent 
  WHERE parent.id = tasks.parent_task_id
)
WHERE parent_task_id IS NOT NULL 
AND list_id IS NULL;