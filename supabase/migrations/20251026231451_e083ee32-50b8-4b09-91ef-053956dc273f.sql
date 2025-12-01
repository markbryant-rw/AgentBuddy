-- Add user activity and status tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add branding and archival to agencies
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS brand_color TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Add archival flag to teams
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create user activity log for analytics
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  module_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all activity
CREATE POLICY "Platform admins can view all activity"
ON user_activity_log
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
ON user_activity_log
FOR SELECT
USING (user_id = auth.uid());

-- System can insert activity
CREATE POLICY "System can insert activity"
ON user_activity_log
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at DESC);