-- Fix RLS policy for messages to check can_post permission
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid() 
    AND conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() 
        AND can_post = true
    )
  );