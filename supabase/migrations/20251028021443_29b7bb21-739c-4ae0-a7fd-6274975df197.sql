-- Add new fields to listings_pipeline table
ALTER TABLE listings_pipeline 
ADD COLUMN IF NOT EXISTS suburb TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
ADD COLUMN IF NOT EXISTS appraisal_date DATE,
ADD COLUMN IF NOT EXISTS listing_appointment_date DATE,
ADD COLUMN IF NOT EXISTS contract_signed_date DATE,
ADD COLUMN IF NOT EXISTS campaign_start_date DATE,
ADD COLUMN IF NOT EXISTS open_home_dates JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index on assigned_to for team filtering
CREATE INDEX IF NOT EXISTS idx_listings_pipeline_assigned_to ON listings_pipeline(assigned_to);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_listings_pipeline_status ON listings_pipeline(status);

-- Enable RLS on listings_pipeline (if not already enabled)
ALTER TABLE listings_pipeline ENABLE ROW LEVEL SECURITY;

-- Create analytics table for pipeline stats
CREATE TABLE IF NOT EXISTS listing_pipeline_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_listings INT DEFAULT 0,
  hot_count INT DEFAULT 0,
  warm_count INT DEFAULT 0,
  cold_count INT DEFAULT 0,
  conversion_rate NUMERIC,
  total_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on stats table
ALTER TABLE listing_pipeline_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for stats table
CREATE POLICY "Users can view their team's pipeline stats"
ON listing_pipeline_stats FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their team's pipeline stats"
ON listing_pipeline_stats FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Create index for stats queries
CREATE INDEX IF NOT EXISTS idx_listing_pipeline_stats_team_period 
ON listing_pipeline_stats(team_id, period_start, period_end);