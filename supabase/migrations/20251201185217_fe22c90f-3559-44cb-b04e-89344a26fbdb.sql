-- =====================================================
-- ADD MISSING COLUMNS AND TABLES
-- =====================================================

-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday_visibility TEXT DEFAULT 'everyone';

-- Add missing columns to teams  
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS uses_financial_year BOOLEAN DEFAULT false;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS financial_year_start_month INTEGER DEFAULT 7;

-- Add missing columns to bug_reports
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS expected_behaviour TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS satisfaction_recorded_at TIMESTAMPTZ;

-- Add missing columns to module_policies
ALTER TABLE public.module_policies ADD COLUMN IF NOT EXISTS policy_source TEXT DEFAULT 'default';

-- Add missing columns to friend_connections
ALTER TABLE public.friend_connections ADD COLUMN IF NOT EXISTS accepted BOOLEAN DEFAULT false;

-- Create projects table (referenced by code)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see projects in their teams" ON public.projects FOR SELECT USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

-- Link tasks to projects if not already linked
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_related_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  visibility TEXT DEFAULT 'everyone',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see social posts based on visibility" ON public.social_posts FOR SELECT USING (
  visibility = 'everyone' OR user_id = auth.uid()
);

CREATE POLICY "Users create their own posts" ON public.social_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage their own posts" ON public.social_posts FOR ALL USING (user_id = auth.uid());

-- Create social_post_reactions table
CREATE TABLE IF NOT EXISTS public.social_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, reaction)
);

ALTER TABLE public.social_post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see all reactions" ON public.social_post_reactions FOR SELECT USING (true);
CREATE POLICY "Users manage their own reactions" ON public.social_post_reactions FOR ALL USING (user_id = auth.uid());

-- Create social_post_comments table
CREATE TABLE IF NOT EXISTS public.social_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.social_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see all comments" ON public.social_post_comments FOR SELECT USING (true);
CREATE POLICY "Users create comments" ON public.social_post_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage their own comments" ON public.social_post_comments FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- DATABASE FUNCTIONS REFERENCED BY CODE
-- =====================================================

-- Function to create default task lists for a new team
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(team_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default lists for the team
  INSERT INTO public.task_lists (name, team_id, position)
  VALUES 
    ('To Do', team_id_param, 0),
    ('In Progress', team_id_param, 1),
    ('Done', team_id_param, 2);
END;
$$;

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id uuid, user2_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_conversation_id uuid;
  new_conversation_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO existing_conversation_id
  FROM public.conversations c
  INNER JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = user1_id
  INNER JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = user2_id
  WHERE c.conversation_type = 'dm'
  LIMIT 1;

  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (conversation_type, created_by)
  VALUES ('dm', user1_id)
  RETURNING id INTO new_conversation_id;

  -- Add both users as participants
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES 
    (new_conversation_id, user1_id),
    (new_conversation_id, user2_id);

  RETURN new_conversation_id;
END;
$$;

-- =====================================================
-- INDEXES FOR NEW TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_agency_id ON public.projects(agency_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_post_reactions_post_id ON public.social_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_social_post_comments_post_id ON public.social_post_comments(post_id);