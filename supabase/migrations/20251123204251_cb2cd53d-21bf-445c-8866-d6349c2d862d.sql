-- Make bug reports and feature requests platform-wide (visible to all authenticated users)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can view their team's bug reports" ON bug_reports;
DROP POLICY IF EXISTS "Users can view bug reports from their office" ON bug_reports;

DROP POLICY IF EXISTS "Users can view their own feature requests" ON feature_requests;
DROP POLICY IF EXISTS "Users can view their team's feature requests" ON feature_requests;

-- Create new platform-wide view policies
CREATE POLICY "All authenticated users can view all bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view all feature requests"
  ON feature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Users can still create their own bug reports and feature requests
CREATE POLICY "Users can create their own bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature requests"
  ON feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Platform admins can update bug reports
CREATE POLICY "Platform admins can update bug reports"
  ON bug_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can update feature requests
CREATE POLICY "Platform admins can update feature requests"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can delete bug reports
CREATE POLICY "Platform admins can delete bug reports"
  ON bug_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );

-- Platform admins can delete feature requests
CREATE POLICY "Platform admins can delete feature requests"
  ON feature_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'platform_admin'
      AND revoked_at IS NULL
    )
  );