-- Fix task update permissions - Remove transaction_id restriction from USING clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

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
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);