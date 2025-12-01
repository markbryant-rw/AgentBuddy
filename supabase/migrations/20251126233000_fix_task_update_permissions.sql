-- Fix task update permissions by removing transaction_id restriction from RLS policy
-- This addresses the bug where users can't create, move, or complete tasks
-- Root cause: The RLS policy was blocking ALL task updates due to overly restrictive USING clause

-- Drop the existing policy with the problematic restriction
DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

-- Recreate the policy WITHOUT the transaction_id restriction
-- The transaction_id filtering should happen at the application query level, not RLS level
CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  -- Allow team members to update tasks in their team
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Ensure updated tasks remain in the user's team
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Verify the policy was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks'
    AND policyname = 'Team members can update team tasks'
  ) THEN
    RAISE EXCEPTION 'Failed to create RLS policy: Team members can update team tasks';
  END IF;

  RAISE NOTICE 'RLS policy successfully created: Team members can update team tasks';
END $$;
