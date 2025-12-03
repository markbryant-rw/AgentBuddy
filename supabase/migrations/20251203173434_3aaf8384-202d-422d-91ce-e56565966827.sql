-- Data Cleanup Migration: Normalize addresses by removing embedded suburb duplicates
-- This fixes geocoding issues caused by addresses like "29 Faith Bullock Place, New Lynn 0600" 
-- with suburb field also containing "New Lynn 0600"

-- Clean logged_appraisals table
-- Remove suburb from address field where it's duplicated, and reset geocoding
UPDATE public.logged_appraisals
SET 
  address = TRIM(regexp_replace(address, ',\s*' || regexp_replace(suburb, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*\d*$', '', 'i')),
  geocoded_at = NULL,
  geocode_error = NULL
WHERE suburb IS NOT NULL 
  AND suburb != ''
  AND address ILIKE '%' || split_part(suburb, ' ', 1) || '%';

-- Clean listings_pipeline table
UPDATE public.listings_pipeline
SET 
  address = TRIM(regexp_replace(address, ',\s*' || regexp_replace(suburb, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*\d*$', '', 'i')),
  geocoded_at = NULL,
  geocode_error = NULL
WHERE suburb IS NOT NULL 
  AND suburb != ''
  AND address ILIKE '%' || split_part(suburb, ' ', 1) || '%';

-- Clean past_sales table
UPDATE public.past_sales
SET 
  address = TRIM(regexp_replace(address, ',\s*' || regexp_replace(suburb, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\s*\d*$', '', 'i')),
  geocoded_at = NULL,
  geocode_error = NULL
WHERE suburb IS NOT NULL 
  AND suburb != ''
  AND address ILIKE '%' || split_part(suburb, ' ', 1) || '%';