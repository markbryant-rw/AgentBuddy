-- Fix expected_month: should be December 2024, not December 2025
UPDATE listings_pipeline 
SET expected_month = '2024-12-01'
WHERE expected_month = '2025-12-01';