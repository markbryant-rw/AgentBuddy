-- =====================================================
-- ADD ALL REMAINING MISSING COLUMNS AND TABLES
-- =====================================================

-- Add missing columns to bug_reports
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS workspace_module TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS ai_impact TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;

-- Add missing columns to coaching_conversations
ALTER TABLE public.coaching_conversations ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Add missing columns to kb_card_views
ALTER TABLE public.kb_card_views ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;

-- Add missing columns to conversation_participants
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add missing columns to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS allow_member_invites BOOLEAN DEFAULT true;

-- Create roleplay_scenarios table
CREATE TABLE IF NOT EXISTS public.roleplay_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  category TEXT,
  prompt TEXT NOT NULL,
  objectives JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view scenarios" ON public.roleplay_scenarios FOR SELECT USING (true);
CREATE POLICY "Admins can manage scenarios" ON public.roleplay_scenarios FOR ALL USING (public.has_role(auth.uid(), 'platform_admin'));

-- Create roleplay_sessions table
CREATE TABLE IF NOT EXISTS public.roleplay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.roleplay_scenarios(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  transcript JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions" ON public.roleplay_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own sessions" ON public.roleplay_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins see all sessions" ON public.roleplay_sessions FOR SELECT USING (public.has_role(auth.uid(), 'platform_admin'));

-- Create get_or_create_direct_conversation function (alias)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid, OUT conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the existing function
  SELECT * INTO conversation_id FROM public.get_or_create_conversation(user1_id, user2_id);
END;
$$;

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_roleplay_scenarios_category ON public.roleplay_scenarios(category);
CREATE INDEX IF NOT EXISTS idx_roleplay_scenarios_difficulty ON public.roleplay_scenarios(difficulty);
CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_user_id ON public.roleplay_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_roleplay_sessions_scenario_id ON public.roleplay_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_workspace_module ON public.bug_reports(workspace_module);
CREATE INDEX IF NOT EXISTS idx_bug_reports_vote_count ON public.bug_reports(vote_count DESC);