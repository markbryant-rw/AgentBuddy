-- Restore platform admin UPDATE permissions for bug reports
-- This was accidentally missing after making bug reports platform-wide

CREATE POLICY "Platform admins can update all bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));