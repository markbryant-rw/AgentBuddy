-- =====================================================
-- ADD REMAINING MISSING COLUMNS
-- =====================================================

-- Add more missing columns to bug_reports
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMPTZ;

-- Add missing columns to feature_requests
ALTER TABLE public.feature_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.feature_requests ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE public.feature_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update function signature to match code usage
DROP FUNCTION IF EXISTS public.create_default_lists_for_team(uuid);
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_lists (name, team_id, position)
  VALUES 
    ('To Do', p_team_id, 0),
    ('In Progress', p_team_id, 1),
    ('Done', p_team_id, 2);
END;
$$;

-- Update get_or_create_conversation to match code usage
DROP FUNCTION IF EXISTS public.get_or_create_conversation(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id uuid, user2_id uuid, OUT conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO existing_id
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = user1_id
  INNER JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = user2_id
  WHERE c.conversation_type = 'dm'
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    conversation_id := existing_id;
    RETURN;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (conversation_type, created_by)
  VALUES ('dm', user1_id)
  RETURNING id INTO conversation_id;

  -- Add both users as participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (conversation_id, user1_id),
    (conversation_id, user2_id);
END;
$$;