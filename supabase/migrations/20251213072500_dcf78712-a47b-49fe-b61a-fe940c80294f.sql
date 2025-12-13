-- Phase 4 & 5: Aftercare Settings and Google Calendar Sync for Aftercare

-- Add aftercare settings columns to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS aftercare_reminder_days integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS aftercare_email_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS aftercare_calendar_sync boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS aftercare_excluded_task_types text[] DEFAULT '{}';

-- Add sync_aftercare column to calendar_sync_settings
ALTER TABLE public.calendar_sync_settings
ADD COLUMN IF NOT EXISTS sync_aftercare boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN notification_preferences.aftercare_reminder_days IS 'Days before aftercare task is due to send reminder (1-14)';
COMMENT ON COLUMN notification_preferences.aftercare_email_enabled IS 'Whether to send anniversary emails for aftercare';
COMMENT ON COLUMN notification_preferences.aftercare_calendar_sync IS 'Whether to sync aftercare tasks to Google Calendar';
COMMENT ON COLUMN notification_preferences.aftercare_excluded_task_types IS 'Array of task types user has opted out of';
COMMENT ON COLUMN calendar_sync_settings.sync_aftercare IS 'Whether to sync aftercare tasks to Google Calendar';