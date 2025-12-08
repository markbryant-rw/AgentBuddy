-- Add proposal status tracking to beacon_reports
ALTER TABLE public.beacon_reports 
  ADD COLUMN IF NOT EXISTS proposal_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS proposal_declined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS proposal_decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS campaign_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS days_on_market INTEGER;

-- Add index for looking up reports by appraisal + type (for webhook matching)
CREATE INDEX IF NOT EXISTS idx_beacon_reports_appraisal_type 
  ON public.beacon_reports(appraisal_id, report_type);

-- Add unique constraint on engagement events for idempotency
-- Drop existing if any, then recreate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beacon_engagement_events_idempotency'
  ) THEN
    ALTER TABLE public.beacon_engagement_events 
      ADD CONSTRAINT beacon_engagement_events_idempotency 
      UNIQUE (appraisal_id, event_type, occurred_at);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, ignore
  NULL;
END $$;