-- Add user preference fields for impersonation notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_on_impersonation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_live_impersonation_banner BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.notify_on_impersonation IS 'Whether to notify user when a platform admin accesses their account';
COMMENT ON COLUMN public.profiles.show_live_impersonation_banner IS 'Whether to show live banner when admin is viewing their account';

-- Enable realtime for admin_impersonation_log table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_impersonation_log;