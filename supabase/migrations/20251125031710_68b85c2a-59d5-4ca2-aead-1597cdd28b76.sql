-- Drop the legacy conflicting policy that's missing WITH CHECK clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;