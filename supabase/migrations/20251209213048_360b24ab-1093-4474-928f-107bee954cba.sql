-- Schedule daily cleanup job for expired agency accounts
-- Runs daily at midnight NZT (11:00 UTC previous day during NZST, 12:00 UTC during NZDT)
SELECT cron.schedule(
  'cleanup-expired-accounts',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.edge_function_base_url') || '/cleanup-expired-accounts',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  )
  $$
);