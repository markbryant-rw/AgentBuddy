-- Enable realtime for social tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_date ON public.social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_type_date ON public.social_posts(post_type, created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_mood ON public.social_posts(mood) WHERE mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at DESC);

-- Add helper function to check notification preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  preferences JSONB;
  notification_enabled BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT social_preferences INTO preferences
  FROM profiles
  WHERE id = p_user_id;

  -- Map notification types to preference keys and check
  notification_enabled := CASE p_notification_type
    WHEN 'post_reaction' THEN COALESCE((preferences->'notifications'->>'postReactions')::BOOLEAN, true)
    WHEN 'post_comment' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'comment_reply' THEN COALESCE((preferences->'notifications'->>'postComments')::BOOLEAN, true)
    WHEN 'friend_achievement' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'friend_milestone' THEN COALESCE((preferences->'notifications'->>'friendActivity')::BOOLEAN, true)
    WHEN 'team_reflection' THEN COALESCE((preferences->'notifications'->>'weeklyReflections')::BOOLEAN, true)
    WHEN 'post_mention' THEN true
    ELSE true
  END;

  RETURN notification_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;