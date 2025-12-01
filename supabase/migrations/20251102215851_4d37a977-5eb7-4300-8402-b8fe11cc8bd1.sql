-- Phase 1: Add RLS policies for note_templates table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view system templates" ON note_templates;
DROP POLICY IF EXISTS "Team members can view team templates" ON note_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON note_templates;
DROP POLICY IF EXISTS "Team admins can create templates" ON note_templates;
DROP POLICY IF EXISTS "Users can update accessible templates" ON note_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON note_templates;

-- Enable RLS
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view system templates
CREATE POLICY "Anyone can view system templates" ON note_templates
FOR SELECT USING (is_system = true);

-- Team members can view their team's templates
CREATE POLICY "Team members can view team templates" ON note_templates
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Users can view their own templates
CREATE POLICY "Users can view own templates" ON note_templates
FOR SELECT USING (created_by = auth.uid());

-- Team admins can create team templates
CREATE POLICY "Team admins can create templates" ON note_templates
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  (team_id IS NULL OR team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  ))
);

-- Users can update their own templates, admins can update team templates
CREATE POLICY "Users can update accessible templates" ON note_templates
FOR UPDATE USING (
  created_by = auth.uid() OR
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  ))
);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON note_templates
FOR DELETE USING (
  created_by = auth.uid() AND is_system = false
);

-- Phase 3: Add archived_at and usage_count columns
ALTER TABLE note_templates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE note_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;