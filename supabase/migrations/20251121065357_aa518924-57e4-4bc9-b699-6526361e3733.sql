-- Drop existing trigger
DROP TRIGGER IF EXISTS update_transaction_counts_trigger ON tasks;

-- Recreate function with RLS bypass
CREATE OR REPLACE FUNCTION public.update_transaction_task_counts()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporarily disable RLS for this function by setting role to service_role
  PERFORM set_config('role', 'service_role', true);
  
  IF TG_OP = 'DELETE' THEN
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
$$;

-- Recreate trigger
CREATE TRIGGER update_transaction_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_transaction_task_counts();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_transaction_task_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_task_counts() TO service_role;

-- One-time fix: Update all existing transactions with correct counts
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
  )
WHERE EXISTS (
  SELECT 1 FROM tasks 
  WHERE transaction_id = t.id 
  AND list_id IS NULL 
  AND project_id IS NULL
);