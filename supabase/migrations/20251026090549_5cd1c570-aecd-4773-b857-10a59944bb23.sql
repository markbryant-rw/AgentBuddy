-- Add Hub view preferences to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS default_home_view TEXT DEFAULT 'hub' CHECK (default_home_view IN ('hub', 'performance')),
ADD COLUMN IF NOT EXISTS show_daily_digest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS quick_actions_visible BOOLEAN DEFAULT true;