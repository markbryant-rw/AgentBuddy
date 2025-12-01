-- Create logged_appraisals table
CREATE TABLE logged_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  last_edited_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Core Details
  address TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  suburb TEXT,
  region TEXT,
  
  -- Appraisal Info
  appraisal_date DATE NOT NULL,
  appraisal_range_low NUMERIC,
  appraisal_range_high NUMERIC,
  appraisal_method TEXT CHECK (appraisal_method IN ('in_person', 'virtual', 'desktop')),
  
  -- Tracking
  warmth TEXT NOT NULL CHECK (warmth IN ('cold', 'warm', 'hot')),
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 10),
  last_contact DATE,
  next_follow_up DATE,
  
  -- Status & Conversion
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'lost', 'archived')),
  opportunity_id UUID REFERENCES listings_pipeline(id) ON DELETE SET NULL,
  converted_date TIMESTAMP WITH TIME ZONE,
  loss_reason TEXT,
  
  -- Location
  latitude NUMERIC,
  longitude NUMERIC,
  geocoded_at TIMESTAMP WITH TIME ZONE,
  geocode_error TEXT,
  
  -- Notes & Attachments
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_logged_appraisals_team_id ON logged_appraisals(team_id);
CREATE INDEX idx_logged_appraisals_appraisal_date ON logged_appraisals(appraisal_date DESC);
CREATE INDEX idx_logged_appraisals_status ON logged_appraisals(status);
CREATE INDEX idx_logged_appraisals_warmth ON logged_appraisals(warmth);
CREATE INDEX idx_logged_appraisals_location ON logged_appraisals(latitude, longitude) WHERE latitude IS NOT NULL;

-- RLS Policies
ALTER TABLE logged_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team's appraisals"
  ON logged_appraisals FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert appraisals"
  ON logged_appraisals FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's appraisals"
  ON logged_appraisals FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete their team's appraisals"
  ON logged_appraisals FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Add bidirectional link to listings_pipeline
ALTER TABLE listings_pipeline 
ADD COLUMN appraisal_id UUID REFERENCES logged_appraisals(id) ON DELETE SET NULL;

CREATE INDEX idx_listings_pipeline_appraisal_id ON listings_pipeline(appraisal_id);

-- Auto-sync trigger function
CREATE OR REPLACE FUNCTION sync_appraisal_opportunity_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'logged_appraisals' AND NEW.opportunity_id IS NOT NULL THEN
    -- Sync appraisal changes to opportunity
    UPDATE listings_pipeline
    SET 
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth::listing_warmth,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact::text,
      last_edited_by = NEW.last_edited_by,
      updated_at = NOW()
    WHERE id = NEW.opportunity_id;
  ELSIF TG_TABLE_NAME = 'listings_pipeline' AND NEW.appraisal_id IS NOT NULL THEN
    -- Sync opportunity changes to appraisal
    UPDATE logged_appraisals
    SET
      address = NEW.address,
      vendor_name = NEW.vendor_name,
      suburb = NEW.suburb,
      warmth = NEW.warmth::text,
      likelihood = NEW.likelihood,
      last_contact = NEW.last_contact::date,
      last_edited_by = NEW.last_edited_by,
      updated_at = NOW()
    WHERE id = NEW.appraisal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_appraisal_to_opportunity
  AFTER UPDATE ON logged_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION sync_appraisal_opportunity_fields();

CREATE TRIGGER sync_opportunity_to_appraisal
  AFTER UPDATE ON listings_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION sync_appraisal_opportunity_fields();

-- Auto-update appraisal status when opportunity is won
CREATE OR REPLACE FUNCTION update_appraisal_on_opportunity_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'won' AND NEW.appraisal_id IS NOT NULL THEN
    UPDATE logged_appraisals
    SET
      status = 'converted',
      converted_date = NOW()
    WHERE id = NEW.appraisal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunity_won_update_appraisal
  AFTER UPDATE ON listings_pipeline
  FOR EACH ROW
  WHEN (NEW.stage = 'won')
  EXECUTE FUNCTION update_appraisal_on_opportunity_won();