-- Fix search path security issue for the trigger function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;