-- Create changelog_entries table for daily product updates
CREATE TABLE public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE UNIQUE NOT NULL,
  raw_changes JSONB NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  email_sent_at TIMESTAMPTZ,
  bug_count INTEGER DEFAULT 0,
  feature_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view changelog entries
CREATE POLICY "Platform admins can view changelog entries"
  ON public.changelog_entries
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Service role can manage changelog entries (for edge functions)
CREATE POLICY "Service role can manage changelog entries"
  ON public.changelog_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add receive_product_updates to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS receive_product_updates BOOLEAN DEFAULT true;