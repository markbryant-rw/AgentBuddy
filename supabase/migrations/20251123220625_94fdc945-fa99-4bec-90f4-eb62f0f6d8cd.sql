-- Fix bug_reports UPDATE policies to allow platform admins to edit any bug report

-- Drop all existing UPDATE policies
DROP POLICY IF EXISTS "Platform admins can update all bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Platform admins can update bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can update their own bug reports" ON bug_reports;

-- Platform admins can update ANY bug report
CREATE POLICY "Platform admins can update any bug report"
ON bug_reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'platform_admin'
    AND revoked_at IS NULL
  )
);

-- Users can update ONLY their own bug reports
CREATE POLICY "Users can update own bug reports"
ON bug_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);