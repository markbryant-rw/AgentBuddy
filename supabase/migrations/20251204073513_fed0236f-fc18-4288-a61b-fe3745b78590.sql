-- Create transaction_stage_templates table for storing reusable task/document templates per stage
CREATE TABLE IF NOT EXISTS public.transaction_stage_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('signed', 'live', 'contract', 'unconditional', 'settled')),
  tasks JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_transaction_stage_templates_team_id ON public.transaction_stage_templates(team_id);
CREATE INDEX idx_transaction_stage_templates_stage ON public.transaction_stage_templates(stage);

-- Enable RLS
ALTER TABLE public.transaction_stage_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies - team members can manage their team's templates
CREATE POLICY "Team members can view their team templates"
ON public.transaction_stage_templates
FOR SELECT
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can create templates"
ON public.transaction_stage_templates
FOR INSERT
WITH CHECK (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can update their team templates"
ON public.transaction_stage_templates
FOR UPDATE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can delete their team templates"
ON public.transaction_stage_templates
FOR DELETE
USING (team_id IN (SELECT get_user_team_ids(auth.uid())) AND is_system_template = false);