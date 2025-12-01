-- Drop ALL existing RLS policies on tasks table
DROP POLICY IF EXISTS "admin_tasks_isolated" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create team tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "Team members can update their project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "Team members can delete team tasks" ON public.tasks;

-- SELECT: Users can view their team tasks
CREATE POLICY "Users can view their team tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create team tasks
CREATE POLICY "Users can create team tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Team members can update team tasks (excluding transaction tasks)
CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
  AND transaction_id IS NULL
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Admins can update any task
CREATE POLICY "Admins can update any task"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'office_manager'::app_role)
);

-- DELETE: Team members can delete their team tasks
CREATE POLICY "Team members can delete their team tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);