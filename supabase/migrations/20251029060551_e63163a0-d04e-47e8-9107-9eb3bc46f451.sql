-- Create task_lists table
CREATE TABLE IF NOT EXISTS public.task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'list',
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on team_id for task_lists
CREATE INDEX IF NOT EXISTS idx_task_lists_team_id ON public.task_lists(team_id);

-- Enable RLS on task_lists
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_lists
CREATE POLICY "Team members can view their team's lists"
  ON public.task_lists FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create lists"
  ON public.task_lists FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their team's lists"
  ON public.task_lists FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete their team's lists"
  ON public.task_lists FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create task_tags table
CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- Create index on team_id for task_tags
CREATE INDEX IF NOT EXISTS idx_task_tags_team_id ON public.task_tags(team_id);

-- Enable RLS on task_tags
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_tags
CREATE POLICY "Team members can view their team's tags"
  ON public.task_tags FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create tags"
  ON public.task_tags FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can delete their team's tags"
  ON public.task_tags FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Create task_tag_assignments table
CREATE TABLE IF NOT EXISTS public.task_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.task_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- Create indexes for task_tag_assignments
CREATE INDEX IF NOT EXISTS idx_task_tag_assignments_task_id ON public.task_tag_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tag_assignments_tag_id ON public.task_tag_assignments(tag_id);

-- Enable RLS on task_tag_assignments
ALTER TABLE public.task_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_tag_assignments
CREATE POLICY "Team members can view tag assignments for their tasks"
  ON public.task_tag_assignments FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Team members can create tag assignments"
  ON public.task_tag_assignments FOR INSERT
  WITH CHECK (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Team members can delete tag assignments"
  ON public.task_tag_assignments FOR DELETE
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  ));

-- Modify tasks table
-- Add list_id column
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.task_lists(id) ON DELETE CASCADE;

-- Create index on list_id
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);

-- Drop status column if it exists
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status;

-- Make project_id nullable (for backwards compatibility)
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;

-- Create function to create default lists for a team
CREATE OR REPLACE FUNCTION public.create_default_lists_for_team(p_team_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if team has no lists yet
  IF NOT EXISTS (SELECT 1 FROM public.task_lists WHERE team_id = p_team_id) THEN
    INSERT INTO public.task_lists (team_id, title, color, icon, order_position, created_by)
    VALUES
      (p_team_id, 'To Do', '#3b82f6', 'circle-dashed', 0, p_user_id),
      (p_team_id, 'In Progress', '#f59e0b', 'clock', 1, p_user_id),
      (p_team_id, 'Done', '#10b981', 'check-circle', 2, p_user_id);
  END IF;
END;
$$;