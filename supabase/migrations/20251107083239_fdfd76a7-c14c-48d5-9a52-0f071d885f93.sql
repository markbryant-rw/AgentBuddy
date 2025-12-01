-- Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('weekly_reflection', 'general_update', 'achievement', 'milestone')),
  content TEXT NOT NULL,
  mood TEXT,
  reflection_data JSONB,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'team_only', 'friends_only', 'office_only')) DEFAULT 'public',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'fire')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weekly_reflection_prompts table
CREATE TABLE IF NOT EXISTS public.weekly_reflection_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_date DATE NOT NULL,
  prompt_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'completed', 'skipped')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create birthday_celebrations table
CREATE TABLE IF NOT EXISTS public.birthday_celebrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  birthday_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  birthday_date DATE NOT NULL,
  auto_post_id UUID REFERENCES public.social_posts(id) ON DELETE SET NULL,
  celebration_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add social fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS birthday_visibility TEXT CHECK (birthday_visibility IN ('public', 'team_only', 'friends_only', 'private')) DEFAULT 'team_only',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS social_preferences JSONB DEFAULT '{"weekly_reflection_reminder": true, "show_achievements": true, "birthday_wishes": true}'::jsonb;

-- Enable Row Level Security
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflection_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_celebrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_posts
CREATE POLICY "Users can view posts based on visibility" ON public.social_posts
  FOR SELECT USING (
    visibility = 'public' 
    OR (visibility = 'team_only' AND user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    ))
    OR (visibility = 'friends_only' AND (
      user_id = auth.uid() OR
      user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      )
    ))
    OR (visibility = 'office_only' AND user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN teams t1 ON tm1.team_id = t1.id
      JOIN teams t2 ON t1.agency_id = t2.agency_id
      JOIN team_members tm2 ON t2.id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    ))
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create their own posts" ON public.social_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON public.social_posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON public.social_posts
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for post_reactions
CREATE POLICY "Users can view reactions on visible posts" ON public.post_reactions
  FOR SELECT USING (
    post_id IN (SELECT id FROM social_posts WHERE 
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'team_only' AND user_id IN (
        SELECT tm1.user_id FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm2.user_id = auth.uid()
      ))
      OR (visibility = 'friends_only' AND user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can add reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions" ON public.post_reactions
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for post_comments
CREATE POLICY "Users can view comments on visible posts" ON public.post_comments
  FOR SELECT USING (
    post_id IN (SELECT id FROM social_posts WHERE 
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'team_only' AND user_id IN (
        SELECT tm1.user_id FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm2.user_id = auth.uid()
      ))
      OR (visibility = 'friends_only' AND user_id IN (
        SELECT CASE 
          WHEN fc.user_id = auth.uid() THEN fc.friend_id
          ELSE fc.user_id
        END
        FROM friend_connections fc
        WHERE fc.accepted = true 
        AND (fc.user_id = auth.uid() OR fc.friend_id = auth.uid())
      ))
    )
  );

CREATE POLICY "Users can add comments" ON public.post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their comments" ON public.post_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their comments" ON public.post_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for weekly_reflection_prompts
CREATE POLICY "Users can view their own prompts" ON public.weekly_reflection_prompts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own prompts" ON public.weekly_reflection_prompts
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for birthday_celebrations
CREATE POLICY "Users can view birthday celebrations" ON public.birthday_celebrations
  FOR SELECT USING (
    birthday_user_id IN (
      SELECT tm1.user_id FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm2.user_id = auth.uid()
    )
    OR birthday_user_id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON public.social_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_prompts_user_id ON public.weekly_reflection_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_prompts_date ON public.weekly_reflection_prompts(prompt_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_posts_timestamp
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();

CREATE TRIGGER update_post_comments_timestamp
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_social_posts_updated_at();