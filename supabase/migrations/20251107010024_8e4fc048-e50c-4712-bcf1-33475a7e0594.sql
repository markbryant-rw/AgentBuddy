-- Create function to provision default personal task board for new users
CREATE OR REPLACE FUNCTION create_default_personal_board(_user_id UUID, _team_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_id UUID;
BEGIN
  -- Check if user already has a personal board
  IF EXISTS (
    SELECT 1 FROM task_boards 
    WHERE created_by = _user_id 
    AND is_shared = false
  ) THEN
    RETURN NULL;
  END IF;

  -- Create personal board
  INSERT INTO task_boards (
    team_id, title, description, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES (
    _team_id, 'Personal Tasks', 'Your private task board', 
    '🔒', '#6366f1', false, _user_id, -1
  )
  RETURNING id INTO _board_id;

  -- Create default lists
  INSERT INTO task_lists (
    team_id, board_id, title, icon, color, 
    is_shared, created_by, order_position
  )
  VALUES 
    (_team_id, _board_id, 'To Do', 'circle', '#3b82f6', false, _user_id, 0),
    (_team_id, _board_id, 'In Progress', 'clock', '#f59e0b', false, _user_id, 1),
    (_team_id, _board_id, 'Done', 'check-circle', '#10b981', false, _user_id, 2);

  RETURN _board_id;
END;
$$;