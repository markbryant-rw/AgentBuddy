-- Add RLS policies for exposed tables (Fixed version)

-- 1. admin_activity_log - Platform admins only
CREATE POLICY "Platform admins can view activity logs"
  ON admin_activity_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert activity logs"
  ON admin_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. admin_impersonation_log - Platform admins only
CREATE POLICY "Platform admins can view impersonation logs"
  ON admin_impersonation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert impersonation logs"
  ON admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. agency_financials - Platform admins only (simplified)
CREATE POLICY "Platform admins can view all financials"
  ON agency_financials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 4. conversation_participants - Participants and admins
CREATE POLICY "Users can view their own participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all participations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Users can manage their own participations"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. module_audit_events - Platform admins only
CREATE POLICY "Platform admins can view module audit events"
  ON module_audit_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert module audit events"
  ON module_audit_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. system_error_log - Platform admins only
CREATE POLICY "Platform admins can view system errors"
  ON system_error_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "System can insert error logs"
  ON system_error_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. task_activity_v2 - Users can view activity on their tasks
CREATE POLICY "Users can view activity on their own tasks"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_activity_v2.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Platform admins can view all task activity"
  ON task_activity_v2 FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));