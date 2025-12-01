-- Drop unused favorite_modules and auto_switch_favorites columns from user_preferences
ALTER TABLE user_preferences 
  DROP COLUMN IF EXISTS favorite_modules,
  DROP COLUMN IF EXISTS auto_switch_favorites;

-- Add index on module_usage_stats for fast top-N queries
CREATE INDEX IF NOT EXISTS idx_module_usage_stats_user_visit_count 
  ON module_usage_stats(user_id, visit_count DESC);