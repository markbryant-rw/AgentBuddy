-- Add share_with_friends column to coaching_conversations
ALTER TABLE coaching_conversations 
ADD COLUMN share_with_friends BOOLEAN DEFAULT false;

-- Update RLS policy to include friends access
DROP POLICY IF EXISTS "Users can view team conversations" ON coaching_conversations;

CREATE POLICY "Users can view shared conversations"
ON coaching_conversations
FOR SELECT
USING (
  auth.uid() = user_id -- Own conversations
  OR (
    is_shared = true 
    AND team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  ) -- Team shared
  OR (
    share_with_friends = true
    AND EXISTS (
      SELECT 1 
      FROM friend_connections 
      WHERE accepted = true
      AND (
        (user_id = coaching_conversations.user_id AND friend_id = auth.uid())
        OR (friend_id = coaching_conversations.user_id AND user_id = auth.uid())
      )
    )
  ) -- Friends shared
);

-- Update coaching_conversation_messages RLS policy
DROP POLICY IF EXISTS "Users can view team conversation messages" ON coaching_conversation_messages;

CREATE POLICY "Users can view shared conversation messages"
ON coaching_conversation_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM coaching_conversations
    WHERE auth.uid() = user_id -- Own
    OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())) -- Team
    OR (share_with_friends = true AND EXISTS (
      SELECT 1 FROM friend_connections fc
      WHERE fc.accepted = true
      AND ((fc.user_id = coaching_conversations.user_id AND fc.friend_id = auth.uid())
           OR (fc.friend_id = coaching_conversations.user_id AND fc.user_id = auth.uid()))
    )) -- Friends
  )
);

-- Update insert policy for messages to include friends access
DROP POLICY IF EXISTS "Users can add messages to accessible conversations" ON coaching_conversation_messages;

CREATE POLICY "Users can add messages to accessible conversations"
ON coaching_conversation_messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid() 
  AND (
    conversation_id IN (
      SELECT id FROM coaching_conversations
      WHERE user_id = auth.uid() -- Own
      OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())) -- Team
      OR (share_with_friends = true AND EXISTS (
        SELECT 1 FROM friend_connections fc
        WHERE fc.accepted = true
        AND ((fc.user_id = coaching_conversations.user_id AND fc.friend_id = auth.uid())
             OR (fc.friend_id = coaching_conversations.user_id AND fc.user_id = auth.uid()))
      )) -- Friends
    )
  )
);