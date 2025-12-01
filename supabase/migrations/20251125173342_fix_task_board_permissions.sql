-- Fix task board permissions by removing transaction_id restriction from RLS policy
-- The transaction_id filtering should happen at the application query level, not at the RLS policy level

-- Drop the existing policy with overly restrictive USING clause
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- Recreate the policy with only team membership check
-- This allows team members to update tasks in their team's boards
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
