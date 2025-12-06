-- Add timezone column to profiles table for user-specific time zone handling
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Pacific/Auckland';

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone identifier (e.g., Pacific/Auckland, America/Los_Angeles). Defaults to Pacific/Auckland for New Zealand users.';

-- Update existing users to have the default timezone (New Zealand)
UPDATE public.profiles 
SET timezone = 'Pacific/Auckland' 
WHERE timezone IS NULL;