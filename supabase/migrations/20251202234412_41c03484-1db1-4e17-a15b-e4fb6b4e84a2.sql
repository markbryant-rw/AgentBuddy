-- Expand past_sales table with comprehensive date tracking and make sale_price/sale_date nullable

-- Add new date fields for full pipeline tracking
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS first_contact_date DATE,
ADD COLUMN IF NOT EXISTS appraisal_date DATE,
ADD COLUMN IF NOT EXISTS listing_signed_date DATE,
ADD COLUMN IF NOT EXISTS listing_live_date DATE,
ADD COLUMN IF NOT EXISTS unconditional_date DATE,
ADD COLUMN IF NOT EXISTS settlement_date DATE,
ADD COLUMN IF NOT EXISTS lost_date DATE;

-- Add location fields
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS geocode_error TEXT;

-- Add appraisal and pricing fields
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS appraisal_low NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_high NUMERIC,
ADD COLUMN IF NOT EXISTS listing_price NUMERIC,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC;

-- Add pipeline tracking fields
ALTER TABLE public.past_sales
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS lead_source_detail TEXT,
ADD COLUMN IF NOT EXISTS days_on_market INTEGER,
ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- Make sale_price nullable (for LOST/WITHDRAWN properties)
ALTER TABLE public.past_sales
ALTER COLUMN sale_price DROP NOT NULL;

-- Make sale_date nullable (we use settlement_date instead, not needed for lost)
ALTER TABLE public.past_sales
ALTER COLUMN sale_date DROP NOT NULL;

-- Add index for suburb queries
CREATE INDEX IF NOT EXISTS idx_past_sales_suburb ON public.past_sales(suburb);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_past_sales_status ON public.past_sales(status);

-- Add comment for documentation
COMMENT ON COLUMN public.past_sales.days_on_market IS 'Calculated: listing_live_date to unconditional_date';