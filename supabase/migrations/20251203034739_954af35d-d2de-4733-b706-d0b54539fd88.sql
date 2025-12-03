-- Set expected_month to current month for all imported listings that have NULL expected_month
UPDATE listings_pipeline 
SET expected_month = DATE_TRUNC('month', CURRENT_DATE)::date
WHERE expected_month IS NULL;