-- Clean up Command Bridge and Dashboard Prototype database artifacts

-- Drop the user_roles table and related objects
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;

-- Drop the app_role enum
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Remove dashboard_mode column from user_preferences
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS dashboard_mode;

-- Remove recent_modules column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS recent_modules;