-- Add expanded_module_sections column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS expanded_module_sections jsonb DEFAULT '[]'::jsonb;