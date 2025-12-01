-- =====================================================
-- LAST REMAINING MISSING ITEMS
-- =====================================================

-- Add missing columns to conversation_participants
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS can_post BOOLEAN DEFAULT true;

-- Add missing columns to notes
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content_plain TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update notes to set owner_id from user_id if not set
UPDATE public.notes SET owner_id = user_id WHERE owner_id IS NULL;

-- Create ai_usage_tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own AI usage" ON public.ai_usage_tracking FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own AI usage" ON public.ai_usage_tracking FOR ALL USING (user_id = auth.uid());

-- Create note_shares table
CREATE TABLE IF NOT EXISTS public.note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, user_id)
);

ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see shares for their notes" ON public.note_shares FOR SELECT USING (
  user_id = auth.uid() OR shared_by = auth.uid()
);
CREATE POLICY "Note owners manage shares" ON public.note_shares FOR ALL USING (
  shared_by = auth.uid() OR note_id IN (SELECT id FROM public.notes WHERE user_id = auth.uid())
);

-- Update add_channel_participant to match code usage
DROP FUNCTION IF EXISTS public.add_channel_participant(uuid, uuid, boolean);
CREATE OR REPLACE FUNCTION public.add_channel_participant(
  channel_id uuid,
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
  VALUES (channel_id, p_user_id, p_is_admin)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON public.note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_user_id ON public.note_shares(user_id);