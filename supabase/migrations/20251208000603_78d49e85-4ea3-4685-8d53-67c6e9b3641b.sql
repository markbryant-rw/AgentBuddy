-- Google Calendar Connections (stores OAuth tokens per user)
CREATE TABLE public.google_calendar_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  calendar_id text, -- The dedicated AgentBuddy calendar ID
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Calendar Sync Settings (user preferences)
CREATE TABLE public.calendar_sync_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sync_daily_planner boolean NOT NULL DEFAULT true,
  sync_appraisals boolean NOT NULL DEFAULT true,
  sync_transactions boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only manage their own connections
CREATE POLICY "Users can manage own calendar connections"
  ON public.google_calendar_connections
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sync settings"
  ON public.calendar_sync_settings
  FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_calendar_connections_user ON public.google_calendar_connections(user_id);
CREATE INDEX idx_calendar_sync_settings_user ON public.calendar_sync_settings(user_id);