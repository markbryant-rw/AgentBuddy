-- Drop the restrictive admin-only update policy
DROP POLICY IF EXISTS "Admins can update member permissions" ON conversation_participants;

-- Create a new policy that allows both creators and admins to update member permissions
CREATE POLICY "Creators and admins can update member permissions"
ON conversation_participants
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    -- Allow if user is admin in this conversation
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR conversation_id IN (
    -- Allow if user is the creator of this conversation
    SELECT id
    FROM conversations
    WHERE created_by = auth.uid()
  )
);