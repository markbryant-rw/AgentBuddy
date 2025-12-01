-- Create module_usage_stats table for tracking module visits
CREATE TABLE module_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id text NOT NULL,
  visit_count integer DEFAULT 0 NOT NULL,
  last_visited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE module_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own usage stats"
  ON module_usage_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage stats"
  ON module_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage stats"
  ON module_usage_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add auto_switch_favorites column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN auto_switch_favorites boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX idx_module_usage_user_id ON module_usage_stats(user_id);
CREATE INDEX idx_module_usage_visit_count ON module_usage_stats(user_id, visit_count DESC);