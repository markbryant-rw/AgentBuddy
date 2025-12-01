-- Add collapsible row preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS collapsed_hub_row_1 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS collapsed_hub_row_2 boolean DEFAULT false;

COMMENT ON COLUMN user_preferences.collapsed_hub_row_1 IS 'Whether the Tasks & Messages dashboard row is collapsed';
COMMENT ON COLUMN user_preferences.collapsed_hub_row_2 IS 'Whether the Performance Overview dashboard row is collapsed';