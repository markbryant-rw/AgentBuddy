-- Create KPI targets table
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  kpi_type TEXT NOT NULL CHECK (kpi_type IN ('calls', 'sms', 'appraisals', 'open_homes', 'listings', 'sales')),
  target_value INTEGER NOT NULL CHECK (target_value >= 0),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('custom', 'business_plan')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_by_admin BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX idx_kpi_targets_user_id ON kpi_targets(user_id);
CREATE INDEX idx_kpi_targets_team_id ON kpi_targets(team_id);
CREATE INDEX idx_kpi_targets_end_date ON kpi_targets(end_date);
CREATE INDEX idx_kpi_targets_user_kpi_period ON kpi_targets(user_id, kpi_type, period_type);

-- Enable RLS
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own targets"
ON kpi_targets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view team targets"
ON kpi_targets FOR SELECT
TO authenticated
USING (team_id IN (
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create own targets"
ON kpi_targets FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update own targets"
ON kpi_targets FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND NOT set_by_admin);

CREATE POLICY "Admins can manage all targets"
ON kpi_targets FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own targets"
ON kpi_targets FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND NOT set_by_admin);

-- Add updated_at trigger
CREATE TRIGGER update_kpi_targets_updated_at
  BEFORE UPDATE ON kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();