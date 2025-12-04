-- Add missing columns to listings_pipeline table if they don't exist

ALTER TABLE public.listings_pipeline
ADD COLUMN IF NOT EXISTS vendor_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS likelihood INTEGER DEFAULT 50 CHECK (likelihood >= 1 AND likelihood <= 100),
ADD COLUMN IF NOT EXISTS last_contact DATE,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.profiles(id);

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_listings_expected_month ON public.listings_pipeline(expected_month);
CREATE INDEX IF NOT EXISTS idx_listings_last_edited_by ON public.listings_pipeline(last_edited_by);
