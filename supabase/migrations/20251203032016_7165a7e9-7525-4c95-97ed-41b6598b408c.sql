-- Add expected_month column to listings_pipeline
ALTER TABLE public.listings_pipeline
ADD COLUMN expected_month date;