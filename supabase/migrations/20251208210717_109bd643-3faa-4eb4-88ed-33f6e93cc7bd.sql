-- Add source column to bug_reports table
ALTER TABLE public.bug_reports 
ADD COLUMN source text NOT NULL DEFAULT 'agentbuddy';

-- Add source column to feature_requests table
ALTER TABLE public.feature_requests 
ADD COLUMN source text NOT NULL DEFAULT 'agentbuddy';

-- Create indexes for filtering by source
CREATE INDEX idx_bug_reports_source ON public.bug_reports(source);
CREATE INDEX idx_feature_requests_source ON public.feature_requests(source);