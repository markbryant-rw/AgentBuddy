-- Weekly Task Settings (team-level configuration)
CREATE TABLE public.weekly_task_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

-- Weekly Task Templates (team's task library)
CREATE TABLE public.weekly_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  default_size_category TEXT DEFAULT 'medium' CHECK (default_size_category IN ('big', 'medium', 'little')),
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add include_weekly_tasks to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS include_weekly_tasks BOOLEAN NOT NULL DEFAULT true;

-- Add weekly task tracking columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_weekly_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_template_id UUID REFERENCES public.weekly_task_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generated_for_week DATE;

-- Indexes for performance
CREATE INDEX idx_weekly_task_settings_team ON public.weekly_task_settings(team_id);
CREATE INDEX idx_weekly_task_templates_team ON public.weekly_task_templates(team_id);
CREATE INDEX idx_tasks_weekly_recurring ON public.tasks(is_weekly_recurring) WHERE is_weekly_recurring = true;
CREATE INDEX idx_tasks_generated_week ON public.tasks(generated_for_week) WHERE generated_for_week IS NOT NULL;

-- Enable RLS
ALTER TABLE public.weekly_task_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_task_settings
CREATE POLICY "Team members can view their team settings"
ON public.weekly_task_settings FOR SELECT
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can manage settings"
ON public.weekly_task_settings FOR ALL
USING (is_team_admin(auth.uid(), team_id));

-- RLS Policies for weekly_task_templates
CREATE POLICY "Team members can view their team templates"
ON public.weekly_task_templates FOR SELECT
USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team admins can manage templates"
ON public.weekly_task_templates FOR ALL
USING (is_team_admin(auth.uid(), team_id));