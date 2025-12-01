-- Drop the existing trigger
DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;

-- Update the log_task_activity function to remove status field references
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'priority_changed',
      jsonb_build_object(
        'old_priority', OLD.priority,
        'new_priority', NEW.priority
      )
    );
  END IF;

  -- Log due date changes
  IF (TG_OP = 'UPDATE' AND OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'due_date_changed',
      jsonb_build_object(
        'old_due_date', OLD.due_date,
        'new_due_date', NEW.due_date
      )
    );
  END IF;

  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'assigned',
      jsonb_build_object(
        'old_assigned_to', OLD.assigned_to,
        'new_assigned_to', NEW.assigned_to
      )
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity();