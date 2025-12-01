-- Fix default status values to match check constraints
-- Update bug_reports status column default from 'pending' to 'triage'
ALTER TABLE public.bug_reports 
  ALTER COLUMN status SET DEFAULT 'triage';

-- Update feature_requests status column default from 'pending' to 'triage' for consistency
ALTER TABLE public.feature_requests 
  ALTER COLUMN status SET DEFAULT 'triage';