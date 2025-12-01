-- Create security definer function to check conversation participation without recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  _conversation_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  );
$$;

-- Drop and recreate RLS policies to use the security definer function
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

CREATE POLICY "Users can view conversation participants"
ON conversation_participants
FOR SELECT
USING (
  public.is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own conversation participants" ON conversation_participants;

CREATE POLICY "Users can update their participation"
ON conversation_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Optimize get_or_create_direct_conversation function
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Use efficient query with proper joins
  SELECT c.id INTO conversation_id
  FROM conversations c
  INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = user1_id
  INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = user2_id
  WHERE c.type = 'direct'
    AND NOT EXISTS (
      SELECT 1 FROM conversation_participants cp3 
      WHERE cp3.conversation_id = c.id 
      AND cp3.user_id NOT IN (user1_id, user2_id)
    )
  LIMIT 1;

  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conversation_id;

    -- Add both participants with can_post = true
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES 
      (conversation_id, user1_id, true),
      (conversation_id, user2_id, true);
  END IF;

  RETURN conversation_id;
END;
$$;