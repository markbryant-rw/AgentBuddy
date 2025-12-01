-- Create the messages table for collaborative threading
CREATE TABLE public.coaching_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.coaching_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.coaching_conversation_messages(conversation_id);
CREATE INDEX idx_messages_author_id ON public.coaching_conversation_messages(author_id);
CREATE INDEX idx_messages_created_at ON public.coaching_conversation_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.coaching_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view messages in conversations they have access to
CREATE POLICY "Users can view team conversation messages"
ON public.coaching_conversation_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.coaching_conversations
    WHERE team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
  OR
  conversation_id IN (
    SELECT id FROM public.coaching_conversations
    WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Users can insert messages into conversations they have access to
CREATE POLICY "Users can add messages to accessible conversations"
ON public.coaching_conversation_messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND
  (
    conversation_id IN (
      SELECT id FROM public.coaching_conversations
      WHERE team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
    OR
    conversation_id IN (
      SELECT id FROM public.coaching_conversations
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policy: Users can only delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.coaching_conversation_messages
FOR DELETE
USING (author_id = auth.uid());

-- Add is_shared column to coaching_conversations
ALTER TABLE public.coaching_conversations
ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Create index for filtering shared conversations
CREATE INDEX idx_conversations_shared ON public.coaching_conversations(is_shared, team_id)
WHERE is_shared = true;

-- Update RLS policy to respect is_shared flag
DROP POLICY IF EXISTS "Users can view team conversations" ON public.coaching_conversations;

CREATE POLICY "Users can view team conversations"
ON public.coaching_conversations
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  (
    is_shared = true
    AND team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Migrate existing messages from JSONB to new table
INSERT INTO public.coaching_conversation_messages (conversation_id, role, content, author_id, created_at)
SELECT 
  cc.id as conversation_id,
  (msg->>'role')::text as role,
  (msg->>'content')::text as content,
  cc.created_by as author_id,
  cc.created_at as created_at
FROM 
  public.coaching_conversations cc,
  jsonb_array_elements(cc.messages) as msg
WHERE 
  jsonb_array_length(cc.messages) > 0;

-- Enable realtime for live collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_conversation_messages;