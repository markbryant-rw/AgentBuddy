-- Add is_admin to conversation_participants
ALTER TABLE conversation_participants 
ADD COLUMN is_admin boolean DEFAULT false;

-- Add allow_member_invites to conversations
ALTER TABLE conversations
ADD COLUMN allow_member_invites boolean DEFAULT true;

-- Update storage bucket to public for image display
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';

-- Policy: Admins can add members
CREATE POLICY "Admins can add members"
ON conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can remove members
CREATE POLICY "Admins can remove members"
ON conversation_participants
FOR DELETE
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy: Admins can update member permissions
CREATE POLICY "Admins can update member permissions"
ON conversation_participants
FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);