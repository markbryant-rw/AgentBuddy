-- Function to sync list sharing from board
CREATE OR REPLACE FUNCTION sync_list_sharing_from_board()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a board's is_shared changes, update all its lists
  IF OLD.is_shared IS DISTINCT FROM NEW.is_shared THEN
    UPDATE task_lists
    SET is_shared = NEW.is_shared,
        updated_at = now()
    WHERE board_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on task_boards
DROP TRIGGER IF EXISTS sync_list_sharing_trigger ON task_boards;
CREATE TRIGGER sync_list_sharing_trigger
  AFTER UPDATE ON task_boards
  FOR EACH ROW
  EXECUTE FUNCTION sync_list_sharing_from_board();

-- One-time sync: Update all existing lists to match their board's sharing status
UPDATE task_lists tl
SET is_shared = tb.is_shared,
    updated_at = now()
FROM task_boards tb
WHERE tl.board_id = tb.id
  AND tl.is_shared IS DISTINCT FROM tb.is_shared;