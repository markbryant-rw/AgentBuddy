-- Add visual customization columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS icon text DEFAULT '📋',
ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT true;

-- Add index for shared projects lookup
CREATE INDEX IF NOT EXISTS idx_projects_is_shared ON public.projects(is_shared);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON public.projects(team_id);

-- Update RLS policies to handle is_shared (solo) projects
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
CREATE POLICY "Users can view projects" ON public.projects
FOR SELECT USING (
  -- User created the project
  created_by = auth.uid()
  -- OR project is shared and user is in the same team
  OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects
FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
CREATE POLICY "Users can update projects" ON public.projects
FOR UPDATE USING (
  created_by = auth.uid()
  OR (is_shared = true AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
CREATE POLICY "Users can delete projects" ON public.projects
FOR DELETE USING (
  created_by = auth.uid()
);