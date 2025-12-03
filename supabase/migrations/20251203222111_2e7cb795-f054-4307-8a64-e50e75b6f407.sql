-- Drop the incorrect foreign key constraint (referencing task_projects)
ALTER TABLE public.task_lists 
DROP CONSTRAINT IF EXISTS task_lists_project_id_fkey;

-- Add correct foreign key constraint (referencing projects)
ALTER TABLE public.task_lists 
ADD CONSTRAINT task_lists_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;