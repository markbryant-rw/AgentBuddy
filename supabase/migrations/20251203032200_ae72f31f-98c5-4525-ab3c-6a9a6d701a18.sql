-- Add missing columns to transactions table to match frontend expectations

-- Identity and contact columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS listing_id text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS client_phone text;

-- Vendor/Buyer information
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS vendor_names jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS buyer_names jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS vendor_phone text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS vendor_email text;

-- Lead and campaign tracking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS campaign_type text;

-- Pricing columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS vendor_price numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS team_price numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS price_alignment_status text DEFAULT 'pending';

-- Additional date columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS unconditional_date date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS conditional_date date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS listing_signed_date date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS photoshoot_date date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS building_report_date date;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS pre_settlement_inspection_date date;

-- Task and document tracking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tasks_total integer DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tasks_done integer DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS docs_total integer DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS docs_done integer DEFAULT 0;

-- Links and attachments
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Geocoding columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS geocoded_at timestamp with time zone;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS geocode_error text;

-- Deal history for tracking changes
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deal_history jsonb DEFAULT '[]'::jsonb;