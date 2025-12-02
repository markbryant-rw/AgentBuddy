-- Comprehensive Schema Alignment Migration (Fixed)
-- This migration adds missing columns and renames existing ones to match frontend code

-- =====================================================
-- TRANSACTIONS TABLE UPDATES
-- =====================================================

-- Add missing columns to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS expected_settlement date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS warmth text DEFAULT 'active';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS on_hold boolean DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- =====================================================
-- DAILY_PLANNER_ITEMS TABLE UPDATES
-- =====================================================

-- Add missing columns to daily_planner_items
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id);
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS size_category text DEFAULT 'medium';
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.daily_planner_items ADD COLUMN IF NOT EXISTS estimated_minutes integer;

-- Copy data from old columns to new ones
UPDATE public.daily_planner_items SET scheduled_date = date WHERE scheduled_date IS NULL AND date IS NOT NULL;
UPDATE public.daily_planner_items SET notes = description WHERE notes IS NULL AND description IS NOT NULL;

-- =====================================================
-- QUARTERLY_REVIEWS TABLE UPDATES
-- =====================================================

-- Add missing columns to quarterly_reviews
ALTER TABLE public.quarterly_reviews ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'team';
ALTER TABLE public.quarterly_reviews ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
ALTER TABLE public.quarterly_reviews ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- =====================================================
-- TASK_ATTACHMENTS TABLE UPDATES
-- =====================================================

-- Rename columns in task_attachments to match code
DO $$
BEGIN
  -- Rename file_url to file_path if file_url exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'task_attachments' 
             AND column_name = 'file_url') THEN
    ALTER TABLE public.task_attachments RENAME COLUMN file_url TO file_path;
  END IF;
  
  -- Rename user_id to uploaded_by if user_id exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'task_attachments' 
             AND column_name = 'user_id') THEN
    ALTER TABLE public.task_attachments RENAME COLUMN user_id TO uploaded_by;
  END IF;
END $$;

-- =====================================================
-- NOTE_SHARES TABLE UPDATES
-- =====================================================

-- Rename shared_by to invited_by in note_shares
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'note_shares' 
             AND column_name = 'shared_by') THEN
    ALTER TABLE public.note_shares RENAME COLUMN shared_by TO invited_by;
  END IF;
END $$;

-- =====================================================
-- DROP AND RECREATE add_channel_participant FUNCTION
-- =====================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.add_channel_participant(uuid, uuid, boolean);

-- Create with new parameter names
CREATE OR REPLACE FUNCTION public.add_channel_participant(
  channel_id uuid, 
  new_user_id uuid, 
  allow_posting boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id, can_post)
  VALUES (channel_id, new_user_id, allow_posting)
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET can_post = allow_posting;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- UPDATE get_or_create_conversation FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  user1_id uuid, 
  user2_id uuid,
  OUT conversation_id uuid
)
RETURNS uuid AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO existing_id
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp1 
    ON c.id = cp1.conversation_id AND cp1.user_id = user1_id
  INNER JOIN public.conversation_participants cp2 
    ON c.id = cp2.conversation_id AND cp2.user_id = user2_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;