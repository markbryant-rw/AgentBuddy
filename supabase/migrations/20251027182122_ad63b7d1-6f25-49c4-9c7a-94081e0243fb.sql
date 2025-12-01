-- Add favorite_modules column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN favorite_modules text[] DEFAULT '{}';

COMMENT ON COLUMN user_preferences.favorite_modules IS 'Array of up to 4 favorite module IDs for quick access on dashboard';