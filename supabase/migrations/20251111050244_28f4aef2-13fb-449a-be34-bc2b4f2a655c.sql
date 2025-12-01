-- Add recent_modules column to profiles table for tracking recently viewed modules
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS recent_modules jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.recent_modules IS 'Array of recently viewed module IDs, stored as ModuleId[]';
