-- Phase 1: Complete Task Isolation for Admin Roles (Fixed)
-- Ensure admin tasks are completely separate from salesperson tasks

-- Add constraint to ensure owner_role matches is_personal_admin_board
ALTER TABLE task_boards 
ADD CONSTRAINT check_admin_board_role 
CHECK (
  (is_personal_admin_board = true AND owner_role IS NOT NULL) OR
  (is_personal_admin_board = false AND owner_role IS NULL)
);

-- Update RLS policies for complete isolation
DROP POLICY IF EXISTS "platform_admins_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "office_managers_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "platform_admin_boards_isolated" ON task_boards;
DROP POLICY IF EXISTS "office_manager_boards_isolated" ON task_boards;

-- Platform admin can only see their personal admin boards
CREATE POLICY "platform_admin_boards_isolated" ON task_boards
FOR ALL USING (
  (is_personal_admin_board = true 
   AND owner_role = 'platform_admin'
   AND created_by = auth.uid()
   AND has_role(auth.uid(), 'platform_admin'))
  OR
  (is_personal_admin_board = false 
   AND created_by = auth.uid()
   AND NOT (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'office_manager')))
);

-- Office manager can only see their personal admin boards
CREATE POLICY "office_manager_boards_isolated" ON task_boards
FOR ALL USING (
  (is_personal_admin_board = true 
   AND owner_role = 'office_manager'
   AND created_by = auth.uid()
   AND has_role(auth.uid(), 'office_manager'))
  OR
  (is_personal_admin_board = false 
   AND created_by = auth.uid()
   AND NOT (has_role(auth.uid(), 'platform_admin') OR has_role(auth.uid(), 'office_manager')))
);

-- Ensure task lists inherit the isolation
DROP POLICY IF EXISTS "admin_task_lists_isolated" ON task_lists;
CREATE POLICY "admin_task_lists_isolated" ON task_lists
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM task_boards
    WHERE task_boards.id = task_lists.board_id
    AND task_boards.created_by = auth.uid()
  )
);

-- Ensure tasks inherit the isolation
DROP POLICY IF EXISTS "admin_tasks_isolated" ON tasks;
CREATE POLICY "admin_tasks_isolated" ON tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM task_lists
    JOIN task_boards ON task_boards.id = task_lists.board_id
    WHERE task_lists.id = tasks.list_id
    AND task_boards.created_by = auth.uid()
  )
);

-- Create function to initialize admin task board
CREATE OR REPLACE FUNCTION ensure_admin_task_board(
  p_user_id uuid,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_board_name text;
BEGIN
  -- Check if board already exists
  SELECT id INTO v_board_id
  FROM task_boards
  WHERE created_by = p_user_id
    AND is_personal_admin_board = true
    AND owner_role = p_role
  LIMIT 1;

  -- Create if doesn't exist
  IF v_board_id IS NULL THEN
    v_board_name := CASE p_role
      WHEN 'platform_admin' THEN 'Platform Tasks'
      WHEN 'office_manager' THEN 'Office Tasks'
      ELSE 'Admin Tasks'
    END;

    INSERT INTO task_boards (
      title,
      created_by,
      is_personal_admin_board,
      owner_role,
      is_shared,
      order_position
    ) VALUES (
      v_board_name,
      p_user_id,
      true,
      p_role,
      false,
      0
    )
    RETURNING id INTO v_board_id;

    -- Create default lists
    INSERT INTO task_lists (board_id, title, color, icon, order_position, created_by)
    VALUES
      (v_board_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (v_board_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (v_board_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;

  RETURN v_board_id;
END;
$$;