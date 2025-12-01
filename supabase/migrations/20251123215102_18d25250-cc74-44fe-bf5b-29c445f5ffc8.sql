-- Migrate all 'investigating' status bugs to 'triage'
UPDATE bug_reports
SET status = 'triage'
WHERE status = 'investigating';

-- Migrate 'declined' status features to 'archived' with reason
UPDATE feature_requests
SET status = 'archived',
    archived_at = COALESCE(archived_at, NOW()),
    archived_reason = COALESCE(archived_reason, 'declined')
WHERE status = 'declined';

-- Migrate 'under_consideration' status features to 'triage' (if any exist)
UPDATE feature_requests
SET status = 'triage'
WHERE status = 'under_consideration';

-- Update CHECK constraint for bug_reports to remove 'investigating'
ALTER TABLE bug_reports
DROP CONSTRAINT IF EXISTS bug_reports_status_check;

ALTER TABLE bug_reports
ADD CONSTRAINT bug_reports_status_check
CHECK (status IN ('triage', 'in_progress', 'needs_review', 'fixed', 'archived'));

-- Update CHECK constraint for feature_requests to remove old statuses
ALTER TABLE feature_requests
DROP CONSTRAINT IF EXISTS feature_requests_status_check;

ALTER TABLE feature_requests
ADD CONSTRAINT feature_requests_status_check
CHECK (status IN ('triage', 'in_progress', 'needs_review', 'completed', 'archived'));