-- Phase 1: Create appraisal_stage_templates table
CREATE TABLE public.appraisal_stage_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  stage text NOT NULL CHECK (stage IN ('VAP', 'MAP', 'LAP')),
  tasks jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_appraisal_templates_team_stage ON public.appraisal_stage_templates(team_id, stage);

-- Add appraisal columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS appraisal_id uuid REFERENCES logged_appraisals(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS appraisal_stage text;
CREATE INDEX IF NOT EXISTS idx_tasks_appraisal_id ON public.tasks(appraisal_id);

-- Enable RLS
ALTER TABLE public.appraisal_stage_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appraisal_stage_templates
CREATE POLICY "Team members can view appraisal templates"
ON public.appraisal_stage_templates FOR SELECT
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can insert appraisal templates"
ON public.appraisal_stage_templates FOR INSERT
WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can update appraisal templates"
ON public.appraisal_stage_templates FOR UPDATE
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can delete appraisal templates"
ON public.appraisal_stage_templates FOR DELETE
USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));