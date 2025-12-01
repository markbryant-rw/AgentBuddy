-- Fix friend lookup RLS issue with SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.lookup_profile_by_invite_code(code TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, full_name, email 
  FROM profiles 
  WHERE invite_code = UPPER(TRIM(code))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_invite_code TO authenticated;

-- Create user_preferences table for Setup page customization
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Theme preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  
  -- Notification preferences
  notify_friend_checkin BOOLEAN DEFAULT TRUE,
  notify_conversation_share BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  
  -- Privacy settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  stats_visibility TEXT DEFAULT 'public' CHECK (stats_visibility IN ('public', 'friends', 'private')),
  leaderboard_participation BOOLEAN DEFAULT TRUE,
  
  -- Dashboard preferences
  dashboard_edit_mode BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();