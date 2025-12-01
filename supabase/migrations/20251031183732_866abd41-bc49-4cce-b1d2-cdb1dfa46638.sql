-- Create function to automatically update transaction task counts
CREATE OR REPLACE FUNCTION update_transaction_task_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update for INSERT or UPDATE or DELETE
  IF TG_OP = 'DELETE' THEN
    -- Only update if the deleted task had a transaction_id
    IF OLD.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = OLD.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = OLD.transaction_id;
    END IF;
    RETURN OLD;
  ELSE
    -- Only update if the task has a transaction_id
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE transactions
      SET 
        tasks_total = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND list_id IS NULL 
          AND project_id IS NULL
        ),
        tasks_done = (
          SELECT COUNT(*) 
          FROM tasks 
          WHERE transaction_id = NEW.transaction_id 
          AND completed = true 
          AND list_id IS NULL 
          AND project_id IS NULL
        )
      WHERE id = NEW.transaction_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS update_transaction_counts_trigger ON tasks;
CREATE TRIGGER update_transaction_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_transaction_task_counts();

-- One-time update to set correct counts for all existing transactions
UPDATE transactions t
SET 
  tasks_total = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND list_id IS NULL 
    AND project_id IS NULL
  ),
  tasks_done = (
    SELECT COUNT(*) 
    FROM tasks 
    WHERE transaction_id = t.id 
    AND completed = true 
    AND list_id IS NULL 
    AND project_id IS NULL
  );