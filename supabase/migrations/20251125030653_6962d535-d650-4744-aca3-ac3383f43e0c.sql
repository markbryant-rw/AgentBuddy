-- Drop conflicting UPDATE policies that are causing permission issues
DROP POLICY IF EXISTS "Users can update relevant tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks they last modified" ON public.tasks;

-- Create single comprehensive team-based policy for project tasks
CREATE POLICY "Team members can update their project tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
  AND transaction_id IS NULL
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid()
  )
  AND transaction_id IS NULL
);

-- Add admin override policy for platform admins and office managers
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