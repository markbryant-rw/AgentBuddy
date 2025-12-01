-- Make bug reports platform-wide (visible to all authenticated users)
-- This prevents duplicate bug reports across teams and improves transparency

-- Drop the restrictive team-scoped SELECT policies
DROP POLICY IF EXISTS "Users can view their own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Team members can view bug reports" ON public.bug_reports;

-- Create platform-wide visibility policy
-- All authenticated users can now see all bug reports (matches feature request behavior)
CREATE POLICY "Users can view all bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (true);

-- Note: INSERT policy remains unchanged (users can only create bugs as themselves)
-- Note: UPDATE policies remain admin-only (only platform admins can change status/severity)