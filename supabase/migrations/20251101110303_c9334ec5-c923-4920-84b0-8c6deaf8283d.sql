-- Fix circular dependency in conversation_participants and messages

-- Step 1: Fix conversation_participants policies (remove self-reference)
DROP POLICY IF EXISTS "conversation_participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete" ON conversation_participants;

-- Simple policies without circular references
CREATE POLICY "conversation_participants_select" ON conversation_participants 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_insert" ON conversation_participants 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_update" ON conversation_participants 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "conversation_participants_delete" ON conversation_participants 
FOR DELETE TO authenticated 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

-- Step 2: Create helper function for checking conversation access
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
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

-- Step 3: Update messages policies to use helper function
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages 
FOR SELECT TO authenticated 
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages 
FOR INSERT TO authenticated 
WITH CHECK (
  author_id = auth.uid() 
  AND is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "messages_update" ON messages 
FOR UPDATE TO authenticated 
USING (author_id = auth.uid());

CREATE POLICY "messages_delete" ON messages 
FOR DELETE TO authenticated 
USING (author_id = auth.uid());

-- Step 4: Fix conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

CREATE POLICY "conversations_select" ON conversations 
FOR SELECT TO authenticated 
USING (is_conversation_participant(id, auth.uid()));

CREATE POLICY "conversations_insert" ON conversations 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON conversations 
FOR UPDATE TO authenticated 
USING (is_conversation_participant(id, auth.uid()));