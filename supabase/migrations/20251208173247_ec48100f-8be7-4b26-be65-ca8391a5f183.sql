-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule demo data reset at midnight NZT (11:00 UTC during NZST, 12:00 UTC during NZDT)
-- Using 11:00 UTC which is midnight during NZ Standard Time
SELECT cron.schedule(
  'reset-demo-data-midnight',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mxsefnpxrnamupatgrlb.supabase.co/functions/v1/reset-demo-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2VmbnB4cm5hbXVwYXRncmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDE3ODQsImV4cCI6MjA3OTk3Nzc4NH0.VNageWt6qo_XR2G37f_tcyCisQZ4wJ24bBGj3QCtTYs'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);