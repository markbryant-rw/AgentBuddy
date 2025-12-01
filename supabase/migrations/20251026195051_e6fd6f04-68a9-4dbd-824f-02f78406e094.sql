-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT,
  due_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  listing_id UUID REFERENCES public.listings_pipeline(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_projects_listing_id ON public.projects(listing_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Team members can view projects"
  ON public.projects FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update projects"
  ON public.projects FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete projects"
  ON public.projects FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create project_assignees table
CREATE TABLE public.project_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Add index
CREATE INDEX idx_project_assignees_project_id ON public.project_assignees(project_id);
CREATE INDEX idx_project_assignees_user_id ON public.project_assignees(user_id);

-- Enable RLS
ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_assignees
CREATE POLICY "Team members can view project assignees"
  ON public.project_assignees FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can manage project assignees"
  ON public.project_assignees FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  ));

-- Add project_id column to tasks table
ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);

-- Add status column to listings_pipeline
ALTER TABLE public.listings_pipeline ADD COLUMN status TEXT NOT NULL DEFAULT 'lead';

-- Add index for performance
CREATE INDEX idx_listings_pipeline_status ON public.listings_pipeline(status);

-- Create project_templates table
CREATE TABLE public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lifecycle_stage TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_project_templates_team_id ON public.project_templates(team_id);
CREATE INDEX idx_project_templates_lifecycle_stage ON public.project_templates(lifecycle_stage);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_templates
CREATE POLICY "Team members can view templates"
  ON public.project_templates FOR SELECT
  USING (
    is_system_default = true 
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage templates"
  ON public.project_templates FOR ALL
  USING (
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert default project templates
INSERT INTO public.project_templates (name, description, lifecycle_stage, tasks, is_system_default, created_by) VALUES
(
  'Listing-to-Launch',
  'Pre-launch checklist for new listings going live',
  'live',
  '[
    {"title": "Book photographer", "priority": "high", "due_offset_days": -7},
    {"title": "Prepare vendor report", "priority": "high", "due_offset_days": -5},
    {"title": "Create listing description", "priority": "medium", "due_offset_days": -4},
    {"title": "Upload to portals", "priority": "high", "due_offset_days": -2},
    {"title": "Social media post approval", "priority": "medium", "due_offset_days": -1},
    {"title": "Print brochures", "priority": "medium", "due_offset_days": -3},
    {"title": "Schedule open home", "priority": "high", "due_offset_days": -2},
    {"title": "Brief team members", "priority": "medium", "due_offset_days": -1}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Contract-to-Unconditional',
  'Tasks during the conditional period',
  'under_contract',
  '[
    {"title": "Send updated agreement to solicitors", "priority": "high", "due_offset_days": 1},
    {"title": "Notify all parties of contract", "priority": "high", "due_offset_days": 1},
    {"title": "Organize building & pest inspection", "priority": "high", "due_offset_days": 3},
    {"title": "Weekly vendor update call", "priority": "medium", "due_offset_days": 7},
    {"title": "Follow up on finance approval", "priority": "high", "due_offset_days": 10},
    {"title": "Check cooling-off period expiry", "priority": "high", "due_offset_days": 5},
    {"title": "Confirm unconditional status", "priority": "high", "due_offset_days": 14}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Unconditional-to-Settlement',
  'Final steps leading to settlement',
  'unconditional',
  '[
    {"title": "Confirm settlement date with solicitors", "priority": "high", "due_offset_days": 1},
    {"title": "Arrange final property inspection", "priority": "medium", "due_offset_days": -3},
    {"title": "Coordinate key handover", "priority": "high", "due_offset_days": -1},
    {"title": "Prepare settlement statement", "priority": "medium", "due_offset_days": -5},
    {"title": "Notify utility companies", "priority": "low", "due_offset_days": -7},
    {"title": "Final vendor walkthrough", "priority": "medium", "due_offset_days": -2},
    {"title": "Confirm funds transfer", "priority": "high", "due_offset_days": 0}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Post-Sale Follow-Up',
  'Post-settlement relationship building',
  'settled',
  '[
    {"title": "Send congratulations gift", "priority": "medium", "due_offset_days": 3},
    {"title": "Request testimonial/review", "priority": "medium", "due_offset_days": 7},
    {"title": "Add to past client database", "priority": "low", "due_offset_days": 1},
    {"title": "Schedule 3-month check-in call", "priority": "low", "due_offset_days": 90},
    {"title": "Send market update newsletter", "priority": "low", "due_offset_days": 30}
  ]'::jsonb,
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();