-- Make user_id nullable on bug_reports and feature_requests to support external submissions
-- External submissions (e.g., from Beacon) don't have a user context

ALTER TABLE bug_reports ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE feature_requests ALTER COLUMN user_id DROP NOT NULL;