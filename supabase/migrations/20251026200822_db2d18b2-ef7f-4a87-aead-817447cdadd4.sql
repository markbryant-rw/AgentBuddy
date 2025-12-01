-- Extend project_templates table with new fields
ALTER TABLE public.project_templates
ADD COLUMN IF NOT EXISTS default_assignee_role TEXT,
ADD COLUMN IF NOT EXISTS template_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create template_usage_log table for analytics
CREATE TABLE IF NOT EXISTS public.template_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings_pipeline(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on template_usage_log
ALTER TABLE public.template_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_usage_log
CREATE POLICY "Team members can view usage logs"
ON public.template_usage_log
FOR SELECT
USING (
  template_id IN (
    SELECT id FROM public.project_templates pt
    WHERE pt.is_system_default = true
    OR pt.team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert usage logs"
ON public.template_usage_log
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_template_usage_log_template_id ON public.template_usage_log(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_log_created_at ON public.template_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_archived ON public.project_templates(is_archived);
CREATE INDEX IF NOT EXISTS idx_project_templates_lifecycle_stage ON public.project_templates(lifecycle_stage);