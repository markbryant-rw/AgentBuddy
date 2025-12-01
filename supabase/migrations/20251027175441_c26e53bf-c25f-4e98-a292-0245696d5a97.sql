-- Create function to get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id uuid)
RETURNS TABLE(id uuid, type text, title text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_current_user_id uuid;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1 
      WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
    )
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF v_conversation_id IS NULL THEN
    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', v_current_user_id)
    RETURNING conversations.id INTO v_conversation_id;
    
    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
    VALUES 
      (v_conversation_id, v_current_user_id, false),
      (v_conversation_id, other_user_id, false);
  END IF;
  
  -- Return the conversation details
  RETURN QUERY
  SELECT c.id, c.type, c.title, c.created_at
  FROM conversations c
  WHERE c.id = v_conversation_id;
END;
$$;