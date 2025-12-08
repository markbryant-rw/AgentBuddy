-- Create beacon_reports table for multiple reports per appraisal
CREATE TABLE public.beacon_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appraisal_id UUID NOT NULL REFERENCES public.logged_appraisals(id) ON DELETE CASCADE,
  beacon_report_id TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'market_appraisal',
  report_url TEXT,
  personalized_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Per-report engagement metrics
  propensity_score INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  email_opens INTEGER DEFAULT 0,
  is_hot_lead BOOLEAN DEFAULT false,
  first_viewed_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE
);

-- Create index for fast lookups by appraisal
CREATE INDEX idx_beacon_reports_appraisal_id ON public.beacon_reports(appraisal_id);

-- Create index for webhook lookups by beacon report ID
CREATE INDEX idx_beacon_reports_beacon_report_id ON public.beacon_reports(beacon_report_id);

-- Enable RLS
ALTER TABLE public.beacon_reports ENABLE ROW LEVEL SECURITY;

-- RLS policy: Team members can view beacon reports for their appraisals
CREATE POLICY "Team members can view beacon reports"
ON public.beacon_reports
FOR SELECT
USING (
  appraisal_id IN (
    SELECT id FROM public.logged_appraisals
    WHERE team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS policy: Team members can insert beacon reports for their appraisals
CREATE POLICY "Team members can insert beacon reports"
ON public.beacon_reports
FOR INSERT
WITH CHECK (
  appraisal_id IN (
    SELECT id FROM public.logged_appraisals
    WHERE team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS policy: Service role can insert/update beacon reports (for edge functions)
CREATE POLICY "Service role can manage beacon reports"
ON public.beacon_reports
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.beacon_reports IS 'Stores multiple Beacon reports per appraisal with per-report engagement metrics';