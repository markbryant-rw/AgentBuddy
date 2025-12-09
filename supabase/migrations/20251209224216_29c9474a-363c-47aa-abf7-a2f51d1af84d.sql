-- Add owners JSONB array column to logged_appraisals, listings_pipeline, and transactions
-- Each owner structure: { id, name, email, phone, is_primary, beacon_owner_id }

-- Add to logged_appraisals
ALTER TABLE public.logged_appraisals 
ADD COLUMN IF NOT EXISTS owners jsonb DEFAULT '[]'::jsonb;

-- Add to listings_pipeline
ALTER TABLE public.listings_pipeline 
ADD COLUMN IF NOT EXISTS owners jsonb DEFAULT '[]'::jsonb;

-- Add to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS owners jsonb DEFAULT '[]'::jsonb;

-- Migrate existing single-owner data to owners array for logged_appraisals
UPDATE public.logged_appraisals
SET owners = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', COALESCE(vendor_name, ''),
    'email', COALESCE(vendor_email, ''),
    'phone', COALESCE(vendor_mobile, ''),
    'is_primary', true,
    'beacon_owner_id', null
  )
)
WHERE vendor_name IS NOT NULL 
  AND vendor_name != ''
  AND (owners IS NULL OR owners = '[]'::jsonb);

-- Migrate existing single-owner data for listings_pipeline
UPDATE public.listings_pipeline
SET owners = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', COALESCE(vendor_name, ''),
    'email', '',
    'phone', '',
    'is_primary', true,
    'beacon_owner_id', null
  )
)
WHERE vendor_name IS NOT NULL 
  AND vendor_name != ''
  AND (owners IS NULL OR owners = '[]'::jsonb);

-- Migrate existing vendor_names array for transactions
-- Note: transactions has vendor_names as jsonb array of names, client_email, client_phone as single values
UPDATE public.transactions
SET owners = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'name', COALESCE(name_value::text, ''),
      'email', CASE WHEN idx = 0 THEN COALESCE(client_email, '') ELSE '' END,
      'phone', CASE WHEN idx = 0 THEN COALESCE(client_phone, '') ELSE '' END,
      'is_primary', idx = 0,
      'beacon_owner_id', null
    )
  )
  FROM jsonb_array_elements_text(vendor_names) WITH ORDINALITY AS t(name_value, idx)
)
WHERE vendor_names IS NOT NULL 
  AND jsonb_array_length(vendor_names) > 0
  AND (owners IS NULL OR owners = '[]'::jsonb);

-- Add index for JSONB queries on owners
CREATE INDEX IF NOT EXISTS idx_logged_appraisals_owners ON public.logged_appraisals USING gin(owners);
CREATE INDEX IF NOT EXISTS idx_listings_pipeline_owners ON public.listings_pipeline USING gin(owners);
CREATE INDEX IF NOT EXISTS idx_transactions_owners ON public.transactions USING gin(owners);