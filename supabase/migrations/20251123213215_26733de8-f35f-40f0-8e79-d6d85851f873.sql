-- Add RLS policy for users to update their own bug reports
CREATE POLICY "Users can update their own bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);