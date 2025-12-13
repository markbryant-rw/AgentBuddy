-- Remove duplicate beacon_reports entries, keeping only the oldest one per beacon_report_id
DELETE FROM beacon_reports a
USING beacon_reports b
WHERE a.beacon_report_id = b.beacon_report_id
  AND a.created_at > b.created_at;