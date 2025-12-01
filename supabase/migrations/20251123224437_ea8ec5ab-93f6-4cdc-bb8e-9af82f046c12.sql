-- Add position columns for persistent Kanban card ordering
ALTER TABLE public.bug_reports 
ADD COLUMN position DOUBLE PRECISION;

ALTER TABLE public.feature_requests 
ADD COLUMN position DOUBLE PRECISION;

-- Create indexes for better query performance
CREATE INDEX idx_bug_reports_position ON public.bug_reports(status, position);
CREATE INDEX idx_feature_requests_position ON public.feature_requests(status, position);

-- Initialize positions for existing bug reports (grouped by status)
WITH ranked_bugs AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) as row_num
  FROM public.bug_reports
)
UPDATE public.bug_reports b
SET position = rb.row_num * 1000
FROM ranked_bugs rb
WHERE b.id = rb.id;

-- Initialize positions for existing feature requests (grouped by status)
WITH ranked_features AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) as row_num
  FROM public.feature_requests
)
UPDATE public.feature_requests f
SET position = rf.row_num * 1000
FROM ranked_features rf
WHERE f.id = rf.id;