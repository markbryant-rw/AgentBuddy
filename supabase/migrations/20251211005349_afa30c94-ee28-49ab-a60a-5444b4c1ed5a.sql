-- Create weekly notification digest cron job
-- Runs at 8pm UTC Sunday = 8am Monday NZT
SELECT cron.schedule(
  'send-weekly-notification-digest',
  '0 20 * * 0',  -- 8pm UTC every Sunday = 8am Monday NZT
  $$
  SELECT net.http_post(
    url := 'https://mxsefnpxrnamupatgrlb.supabase.co/functions/v1/send-notification-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2VmbnB4cm5hbXVwYXRncmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDE3ODQsImV4cCI6MjA3OTk3Nzc4NH0.VNageWt6qo_XR2G37f_tcyCisQZ4wJ24bBGj3QCtTYs'
    ),
    body := '{"frequency": "weekly"}'::jsonb
  ) AS request_id;
  $$
);