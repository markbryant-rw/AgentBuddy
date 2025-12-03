-- Add agency_id to lead_sources for office-level customization
-- NULL agency_id = platform-wide default, specific agency_id = office-specific
ALTER TABLE public.lead_sources ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Update unique constraint to allow same value per agency
ALTER TABLE public.lead_sources DROP CONSTRAINT lead_sources_value_key;
ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_value_agency_unique UNIQUE (value, agency_id);

-- Create index for faster agency-based queries
CREATE INDEX idx_lead_sources_agency ON public.lead_sources (agency_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Platform admins can manage lead sources" ON public.lead_sources;

-- New policies:
-- 1. Anyone can read platform-wide lead sources (agency_id IS NULL)
CREATE POLICY "Anyone can read platform lead sources"
ON public.lead_sources
FOR SELECT
USING (agency_id IS NULL);

-- 2. Users can read their office's lead sources
CREATE POLICY "Users can read their office lead sources"
ON public.lead_sources
FOR SELECT
USING (agency_id = get_user_agency_id(auth.uid()));

-- 3. Office managers can read lead sources for offices they manage
CREATE POLICY "Office managers can read managed office lead sources"
ON public.lead_sources
FOR SELECT
USING (
  agency_id IN (
    SELECT agency_id FROM office_manager_assignments WHERE user_id = auth.uid()
  )
);

-- 4. Platform admins can manage all lead sources
CREATE POLICY "Platform admins can manage all lead sources"
ON public.lead_sources
FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 5. Office managers can manage their office's lead sources (not platform defaults)
CREATE POLICY "Office managers can manage their office lead sources"
ON public.lead_sources
FOR ALL
USING (
  agency_id IS NOT NULL AND
  agency_id IN (
    SELECT agency_id FROM office_manager_assignments WHERE user_id = auth.uid()
  )
);