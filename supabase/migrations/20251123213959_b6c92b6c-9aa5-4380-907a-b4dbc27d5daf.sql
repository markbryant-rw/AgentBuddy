-- Step 1: Add new columns
ALTER TABLE public.bug_reports 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

ALTER TABLE public.feature_requests 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Step 2: Drop existing constraints completely
ALTER TABLE public.bug_reports DROP CONSTRAINT IF EXISTS bug_reports_status_check;
ALTER TABLE public.feature_requests DROP CONSTRAINT IF EXISTS feature_requests_status_check;

-- Step 3: Update all status values to new schema
UPDATE public.bug_reports SET status = 'triage' WHERE status = 'pending';
UPDATE public.feature_requests SET status = 'triage' WHERE status = 'pending';
UPDATE public.feature_requests SET status = 'declined' WHERE status = 'rejected';

-- Step 4: Add new constraints with all valid values
ALTER TABLE public.bug_reports 
  ADD CONSTRAINT bug_reports_status_check 
  CHECK (status IN ('triage', 'investigating', 'in_progress', 'needs_review', 'fixed', 'archived'));

ALTER TABLE public.feature_requests 
  ADD CONSTRAINT feature_requests_status_check 
  CHECK (status IN ('triage', 'under_consideration', 'in_progress', 'needs_review', 'completed', 'declined', 'archived'));

-- Step 5: Create auto-archive function
CREATE OR REPLACE FUNCTION auto_archive_old_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.bug_reports
  SET 
    status = 'archived',
    archived_at = COALESCE(archived_at, now()),
    archived_reason = COALESCE(archived_reason, 'auto_archived')
  WHERE 
    status = 'fixed'
    AND fixed_at IS NOT NULL
    AND fixed_at < now() - INTERVAL '30 days'
    AND (archived_at IS NULL OR status != 'archived');

  UPDATE public.feature_requests
  SET 
    status = 'archived',
    archived_at = COALESCE(archived_at, now()),
    archived_reason = COALESCE(archived_reason, 'auto_archived')
  WHERE 
    status IN ('declined', 'completed')
    AND updated_at < now() - INTERVAL '30 days'
    AND (archived_at IS NULL OR status != 'archived');
END;
$$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_archived_at ON public.bug_reports(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_archived_at ON public.feature_requests(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);