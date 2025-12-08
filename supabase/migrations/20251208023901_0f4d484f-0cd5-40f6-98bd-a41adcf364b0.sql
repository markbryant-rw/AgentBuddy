-- Add new columns to logged_appraisals for tracking report lifecycle
ALTER TABLE logged_appraisals
ADD COLUMN IF NOT EXISTS beacon_report_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS beacon_report_sent_at TIMESTAMPTZ;

-- Create table to store individual engagement events from Beacon
CREATE TABLE IF NOT EXISTS beacon_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID NOT NULL REFERENCES logged_appraisals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'view', 'email_open', 'link_click'
  occurred_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_beacon_events_appraisal ON beacon_engagement_events(appraisal_id);
CREATE INDEX IF NOT EXISTS idx_beacon_events_occurred ON beacon_engagement_events(occurred_at DESC);

-- Enable RLS
ALTER TABLE beacon_engagement_events ENABLE ROW LEVEL SECURITY;

-- Team members can view beacon events for appraisals in their team
CREATE POLICY "Team members can view beacon events" ON beacon_engagement_events
  FOR SELECT USING (
    appraisal_id IN (
      SELECT id FROM logged_appraisals 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Service role can insert events (from webhook)
CREATE POLICY "Service role can insert beacon events" ON beacon_engagement_events
  FOR INSERT WITH CHECK (true);

-- Add unique constraint to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_beacon_events_unique 
  ON beacon_engagement_events(appraisal_id, event_type, occurred_at);