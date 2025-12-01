-- =====================================================
-- FINAL BATCH OF MISSING COLUMNS
-- =====================================================

-- Add missing columns to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'dm';

-- Add missing columns to conversation_participants
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;

-- Add missing columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Create add_channel_participant function
CREATE OR REPLACE FUNCTION public.add_channel_participant(
  p_conversation_id uuid,
  p_user_id uuid,
  p_is_admin boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id, is_admin)
  VALUES (p_conversation_id, p_user_id, p_is_admin)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;