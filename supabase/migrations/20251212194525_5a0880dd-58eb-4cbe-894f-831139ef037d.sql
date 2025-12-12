-- Add is_system_template column to appraisal_stage_templates
ALTER TABLE appraisal_stage_templates
  ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;

-- Index for efficient system template lookups
CREATE INDEX IF NOT EXISTS idx_appraisal_templates_system 
  ON appraisal_stage_templates(is_system_template) 
  WHERE is_system_template = true;

-- Drop existing RLS policies to recreate them
DROP POLICY IF EXISTS "Team members can view appraisal templates" ON appraisal_stage_templates;
DROP POLICY IF EXISTS "Team members can insert appraisal templates" ON appraisal_stage_templates;
DROP POLICY IF EXISTS "Team members can update appraisal templates" ON appraisal_stage_templates;
DROP POLICY IF EXISTS "Team members can delete appraisal templates" ON appraisal_stage_templates;

-- SELECT: Everyone can see system templates + team members see their team templates
CREATE POLICY "View appraisal templates"
  ON appraisal_stage_templates FOR SELECT
  USING (
    is_system_template = true 
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- INSERT: Platform admins can create system templates; Team members can create team templates
CREATE POLICY "Insert appraisal templates"
  ON appraisal_stage_templates FOR INSERT
  WITH CHECK (
    (is_system_template = true AND has_role(auth.uid(), 'platform_admin'::app_role))
    OR (is_system_template = false AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
  );

-- UPDATE: Platform admins can update system templates; Team members can update their team templates
CREATE POLICY "Update appraisal templates"
  ON appraisal_stage_templates FOR UPDATE
  USING (
    (is_system_template = true AND has_role(auth.uid(), 'platform_admin'::app_role))
    OR (is_system_template = false AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
  );

-- DELETE: Only team templates can be deleted (by team members); System templates cannot be deleted
CREATE POLICY "Delete appraisal templates"
  ON appraisal_stage_templates FOR DELETE
  USING (
    is_system_template = false 
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Seed system default templates
INSERT INTO appraisal_stage_templates (name, description, stage, is_system_template, is_default, team_id, tasks)
VALUES 
  -- VAP System Template
  (
    'VAP Default',
    'Standard virtual appraisal workflow tasks',
    'VAP',
    true,
    false,
    NULL,
    '[
      {"title": "Research comparable sales", "section": "Research", "due_offset_days": 0, "priority": "high"},
      {"title": "Check property history", "section": "Research", "due_offset_days": 0, "priority": "medium"},
      {"title": "Prepare desktop valuation", "section": "Report", "due_offset_days": 1, "priority": "high"},
      {"title": "Send VAP report to vendor", "section": "Communication", "due_offset_days": 2, "priority": "high"},
      {"title": "Schedule follow-up call", "section": "Follow-up", "due_offset_days": 3, "priority": "medium"}
    ]'::jsonb
  ),
  -- MAP System Template
  (
    'MAP Default',
    'Standard market appraisal workflow tasks',
    'MAP',
    true,
    false,
    NULL,
    '[
      {"title": "Prepare appraisal pack", "section": "Preparation", "due_offset_days": -1, "priority": "high"},
      {"title": "Conduct property inspection", "section": "Inspection", "due_offset_days": 0, "priority": "high"},
      {"title": "Take property photos", "section": "Inspection", "due_offset_days": 0, "priority": "medium"},
      {"title": "Complete CMA report", "section": "Report", "due_offset_days": 1, "priority": "high"},
      {"title": "Send appraisal report", "section": "Communication", "due_offset_days": 2, "priority": "high"},
      {"title": "Follow-up call", "section": "Follow-up", "due_offset_days": 3, "priority": "medium"},
      {"title": "Send listing proposal", "section": "Proposal", "due_offset_days": 5, "priority": "high"}
    ]'::jsonb
  ),
  -- LAP System Template
  (
    'LAP Default',
    'Standard listing appointment workflow tasks',
    'LAP',
    true,
    false,
    NULL,
    '[
      {"title": "Prepare listing presentation", "section": "Preparation", "due_offset_days": -1, "priority": "high"},
      {"title": "Confirm appointment", "section": "Preparation", "due_offset_days": -1, "priority": "medium"},
      {"title": "Conduct listing presentation", "section": "Appointment", "due_offset_days": 0, "priority": "high"},
      {"title": "Send agency agreement", "section": "Documentation", "due_offset_days": 0, "priority": "high"},
      {"title": "Follow-up on decision", "section": "Follow-up", "due_offset_days": 1, "priority": "high"},
      {"title": "Second follow-up if needed", "section": "Follow-up", "due_offset_days": 3, "priority": "medium"},
      {"title": "Nurture if not ready", "section": "Nurturing", "due_offset_days": 7, "priority": "low"}
    ]'::jsonb
  )
ON CONFLICT DO NOTHING;