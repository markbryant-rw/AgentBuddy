-- Add Beacon tracking columns to logged_appraisals
ALTER TABLE logged_appraisals 
ADD COLUMN IF NOT EXISTS beacon_report_id UUID,
ADD COLUMN IF NOT EXISTS beacon_report_url TEXT,
ADD COLUMN IF NOT EXISTS beacon_personalized_url TEXT,
ADD COLUMN IF NOT EXISTS beacon_propensity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beacon_total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beacon_total_time_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beacon_email_opens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beacon_is_hot_lead BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beacon_last_activity TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beacon_first_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beacon_synced_at TIMESTAMPTZ;

-- Add Beacon tracking columns to listings_pipeline (for converted opportunities)
ALTER TABLE listings_pipeline
ADD COLUMN IF NOT EXISTS beacon_report_id UUID,
ADD COLUMN IF NOT EXISTS beacon_propensity_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS beacon_is_hot_lead BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS beacon_last_activity TIMESTAMPTZ;

-- Create integration_settings table for feature gating
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  connected_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, integration_name)
);

-- Enable RLS on integration_settings
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's integration settings
CREATE POLICY "Team members can view integration settings"
ON integration_settings FOR SELECT
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- Team leaders/admins can manage integration settings
CREATE POLICY "Team admins can manage integration settings"
ON integration_settings FOR ALL
USING (is_team_admin(auth.uid(), team_id));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integration_settings_team_name 
ON integration_settings(team_id, integration_name);

-- Create index on beacon columns for faster queries
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_beacon_hot 
ON logged_appraisals(beacon_is_hot_lead) WHERE beacon_is_hot_lead = true;

CREATE INDEX IF NOT EXISTS idx_logged_appraisals_beacon_score 
ON logged_appraisals(beacon_propensity_score DESC) WHERE beacon_propensity_score > 0;