-- Create lead_source_options table for admin-managed lead sources
CREATE TABLE IF NOT EXISTS lead_source_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, value)
);

-- Enable RLS
ALTER TABLE lead_source_options ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read options for their team
CREATE POLICY "Users can view their team's lead sources"
  ON lead_source_options FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- RLS Policy: Team admins can manage options
CREATE POLICY "Team admins can manage lead sources"
  ON lead_source_options FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND access_level = 'admin'
    )
  );

-- Insert default lead sources for all existing teams
INSERT INTO lead_source_options (team_id, value, label, sort_order)
SELECT id, 'referral', 'Referral', 1 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'referral')
UNION ALL
SELECT id, 'cold_call', 'Cold Call', 2 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'cold_call')
UNION ALL
SELECT id, 'open_home', 'Open Home', 3 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'open_home')
UNION ALL
SELECT id, 'website', 'Website', 4 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'website')
UNION ALL
SELECT id, 'social_media', 'Social Media', 5 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'social_media')
UNION ALL
SELECT id, 'past_client', 'Past Client', 6 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'past_client')
UNION ALL
SELECT id, 'other', 'Other', 7 FROM teams WHERE id NOT IN (SELECT DISTINCT team_id FROM lead_source_options WHERE value = 'other');