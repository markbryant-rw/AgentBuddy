-- Add fallback RLS policy to allow users to update tasks they last modified
-- This ensures better UX when users are updating tasks they've recently interacted with

CREATE POLICY "Users can update tasks they last modified"
ON public.tasks
FOR UPDATE
TO authenticated
USING (last_updated_by = auth.uid())
WITH CHECK (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Users can update tasks they last modified" ON public.tasks IS 
'Allows users to update tasks where they were the last person to modify it, providing a fallback for edge cases where other policies may not apply';