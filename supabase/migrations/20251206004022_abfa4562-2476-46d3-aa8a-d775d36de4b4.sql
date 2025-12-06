-- Allow platform admins to delete bug reports
CREATE POLICY "Platform admins can delete bug reports"
ON public.bug_reports
FOR DELETE
USING (has_role(auth.uid(), 'platform_admin'::app_role));