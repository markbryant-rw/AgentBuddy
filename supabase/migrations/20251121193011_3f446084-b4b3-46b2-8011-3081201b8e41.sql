-- =============================================================================
-- COMPREHENSIVE SECURITY FIX - Part 2: Add missing RLS policies
-- =============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can view activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can view impersonation logs" ON admin_impersonation_log;
DROP POLICY IF EXISTS "System can insert impersonation logs" ON admin_impersonation_log;
DROP POLICY IF EXISTS "Office managers and admins can view financial data" ON agency_financials;
DROP POLICY IF EXISTS "Office managers and admins can manage financial data" ON agency_financials;
DROP POLICY IF EXISTS "Users can view their own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON conversation_participants;
DROP POLICY IF EXISTS "Platform admins can view module audit events" ON module_audit_events;
DROP POLICY IF EXISTS "System can insert module audit events" ON module_audit_events;
DROP POLICY IF EXISTS "Platform admins can view error logs" ON system_error_log;
DROP POLICY IF EXISTS "System can insert error logs" ON system_error_log;
DROP POLICY IF EXISTS "Users can view task activity for their tasks" ON task_activity_v2;
DROP POLICY IF EXISTS "System can insert task activity" ON task_activity_v2;
DROP POLICY IF EXISTS "Platform admins can view health metrics" ON system_health_metrics;
DROP POLICY IF EXISTS "System can insert health metrics" ON system_health_metrics;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON password_reset_rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON password_reset_rate_limits;

-- admin_activity_log: Platform admins only
CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert activity logs"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- admin_impersonation_log: Platform admins only
CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert impersonation logs"
  ON admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- agency_financials: Office managers and platform admins
CREATE POLICY "Office managers and admins can view financial data"
  ON agency_financials FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

CREATE POLICY "Office managers and admins can manage financial data"
  ON agency_financials FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

-- conversation_participants: Participants and admins
CREATE POLICY "Users can view their own participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role])
  );

CREATE POLICY "Conversation admins can manage participants"
  ON conversation_participants FOR ALL
  TO authenticated
  USING (
    is_admin = true AND user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin')
  );

-- module_audit_events: Platform admins only
CREATE POLICY "Platform admins can view module audit events"
  ON module_audit_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert module audit events"
  ON module_audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- system_error_log: Platform admins only
CREATE POLICY "Platform admins can view error logs"
  ON system_error_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert error logs"
  ON system_error_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- task_activity_v2: Users can view their own task activity
CREATE POLICY "Users can view task activity for their tasks"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'platform_admin') OR
    public.has_any_role(auth.uid(), ARRAY['office_manager'::app_role, 'team_leader'::app_role])
  );

CREATE POLICY "System can insert task activity"
  ON task_activity_v2 FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- system_health_metrics: Platform admins only
CREATE POLICY "Platform admins can view health metrics"
  ON system_health_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert health metrics"
  ON system_health_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- password_reset_rate_limits: Users can only see their own
CREATE POLICY "Users can view their own rate limits"
  ON password_reset_rate_limits FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    public.has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "System can manage rate limits"
  ON password_reset_rate_limits FOR ALL
  TO authenticated
  WITH CHECK (true);