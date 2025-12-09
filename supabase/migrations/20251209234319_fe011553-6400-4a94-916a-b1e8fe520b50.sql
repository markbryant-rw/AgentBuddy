-- Update existing feature requests with 'submitted' status to 'triage'
UPDATE public.feature_requests 
SET status = 'triage', updated_at = now()
WHERE status = 'submitted';