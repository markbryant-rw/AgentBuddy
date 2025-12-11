-- Phase 1: Create properties table and add property_id columns

-- 1.1 Create properties table
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  suburb text,
  region text,
  latitude double precision,
  longitude double precision,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for address lookups
CREATE INDEX idx_properties_address_team ON public.properties(team_id, address);
CREATE INDEX idx_properties_team_id ON public.properties(team_id);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Team members only
CREATE POLICY "Team members can view properties"
  ON public.properties FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can update properties"
  ON public.properties FOR UPDATE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can delete properties"
  ON public.properties FOR DELETE
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- 1.2 Add property_id columns to existing tables
ALTER TABLE public.logged_appraisals 
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.listings_pipeline 
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.transactions 
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.beacon_reports 
  ADD COLUMN property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

-- Create indexes for property_id lookups
CREATE INDEX idx_logged_appraisals_property_id ON public.logged_appraisals(property_id);
CREATE INDEX idx_listings_pipeline_property_id ON public.listings_pipeline(property_id);
CREATE INDEX idx_transactions_property_id ON public.transactions(property_id);
CREATE INDEX idx_beacon_reports_property_id ON public.beacon_reports(property_id);

-- 1.3 Fix transactions.listing_id to be proper UUID FK
-- First, clear any invalid data (non-UUID strings)
UPDATE public.transactions SET listing_id = NULL WHERE listing_id IS NOT NULL AND listing_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Convert listing_id from text to uuid
ALTER TABLE public.transactions 
  ALTER COLUMN listing_id TYPE uuid USING listing_id::uuid;

-- Add FK constraint
ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_listing_id_fkey 
  FOREIGN KEY (listing_id) REFERENCES public.listings_pipeline(id) ON DELETE SET NULL;

-- 1.4 Backfill: Create properties from existing appraisals and link them
-- Create properties from unique appraisal addresses
INSERT INTO public.properties (address, suburb, latitude, longitude, team_id, created_by, created_at)
SELECT DISTINCT ON (a.address, a.team_id)
  a.address,
  a.suburb,
  a.latitude,
  a.longitude,
  a.team_id,
  a.created_by,
  COALESCE(a.created_at, now())
FROM public.logged_appraisals a
WHERE a.team_id IS NOT NULL
  AND a.address IS NOT NULL
  AND a.address != ''
ORDER BY a.address, a.team_id, a.created_at ASC;

-- Link appraisals to properties
UPDATE public.logged_appraisals a
SET property_id = p.id
FROM public.properties p
WHERE a.address = p.address
  AND a.team_id = p.team_id
  AND a.property_id IS NULL;

-- Create properties from listings that don't have matching appraisal addresses
INSERT INTO public.properties (address, suburb, latitude, longitude, team_id, created_by, created_at)
SELECT DISTINCT ON (l.address, l.team_id)
  l.address,
  l.suburb,
  l.latitude,
  l.longitude,
  l.team_id,
  l.created_by,
  COALESCE(l.created_at, now())
FROM public.listings_pipeline l
WHERE l.team_id IS NOT NULL
  AND l.address IS NOT NULL
  AND l.address != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.properties p 
    WHERE p.address = l.address AND p.team_id = l.team_id
  )
ORDER BY l.address, l.team_id, l.created_at ASC;

-- Link listings to properties
UPDATE public.listings_pipeline l
SET property_id = p.id
FROM public.properties p
WHERE l.address = p.address
  AND l.team_id = p.team_id
  AND l.property_id IS NULL;

-- Create properties from transactions that don't have matching addresses
INSERT INTO public.properties (address, suburb, latitude, longitude, team_id, created_by, created_at)
SELECT DISTINCT ON (t.address, t.team_id)
  t.address,
  t.suburb,
  t.latitude,
  t.longitude,
  t.team_id,
  t.created_by,
  COALESCE(t.created_at, now())
FROM public.transactions t
WHERE t.team_id IS NOT NULL
  AND t.address IS NOT NULL
  AND t.address != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.properties p 
    WHERE p.address = t.address AND p.team_id = t.team_id
  )
ORDER BY t.address, t.team_id, t.created_at ASC;

-- Link transactions to properties
UPDATE public.transactions t
SET property_id = p.id
FROM public.properties p
WHERE t.address = p.address
  AND t.team_id = p.team_id
  AND t.property_id IS NULL;

-- Link beacon_reports to properties via their appraisal's property_id
UPDATE public.beacon_reports br
SET property_id = a.property_id
FROM public.logged_appraisals a
WHERE br.appraisal_id = a.id
  AND a.property_id IS NOT NULL
  AND br.property_id IS NULL;

-- Create trigger to update properties.updated_at
CREATE OR REPLACE FUNCTION public.update_properties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_properties_updated_at();