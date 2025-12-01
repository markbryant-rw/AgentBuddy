-- ============================================
-- RLS POLICIES FOR SENSITIVE TABLES
-- ============================================

-- 1. admin_activity_log - Platform admins only
-- ============================================
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Platform admins can view activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can insert activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can update activity logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Platform admins can delete activity logs" ON public.admin_activity_log;

CREATE POLICY "Platform admins can view activity logs"
  ON public.admin_activity_log
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert activity logs"
  ON public.admin_activity_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update activity logs"
  ON public.admin_activity_log
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete activity logs"
  ON public.admin_activity_log
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 2. admin_impersonation_log - Platform admins only
-- ============================================
ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "System can insert impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can insert impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can update impersonation logs" ON public.admin_impersonation_log;
DROP POLICY IF EXISTS "Platform admins can delete impersonation logs" ON public.admin_impersonation_log;

CREATE POLICY "Platform admins can view impersonation logs"
  ON public.admin_impersonation_log
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert impersonation logs"
  ON public.admin_impersonation_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update impersonation logs"
  ON public.admin_impersonation_log
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete impersonation logs"
  ON public.admin_impersonation_log
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 3. agency_financials - Platform admins only
-- ============================================
ALTER TABLE public.agency_financials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office managers and admins can manage financial data" ON public.agency_financials;
DROP POLICY IF EXISTS "Office managers and admins can view financial data" ON public.agency_financials;
DROP POLICY IF EXISTS "Platform admins can view all financials" ON public.agency_financials;

CREATE POLICY "Platform admins can view financials"
  ON public.agency_financials
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert financials"
  ON public.agency_financials
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update financials"
  ON public.agency_financials
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete financials"
  ON public.agency_financials
  FOR DELETE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- 4. system_error_log - Platform admins only (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_error_log') THEN
    EXECUTE 'ALTER TABLE public.system_error_log ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can view error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can insert error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can update error logs" ON public.system_error_log';
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins can delete error logs" ON public.system_error_log';
    
    EXECUTE 'CREATE POLICY "Platform admins can view error logs"
      ON public.system_error_log
      FOR SELECT
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can insert error logs"
      ON public.system_error_log
      FOR INSERT
      WITH CHECK (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can update error logs"
      ON public.system_error_log
      FOR UPDATE
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
    
    EXECUTE 'CREATE POLICY "Platform admins can delete error logs"
      ON public.system_error_log
      FOR DELETE
      USING (has_role(auth.uid(), ''platform_admin''::app_role))';
  END IF;
END $$;

-- 5. module_audit_events - Platform admins and office managers
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'module_audit_events') THEN
    EXECUTE 'ALTER TABLE public.module_audit_events ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can view audit events" ON public.module_audit_events';
    EXECUTE 'DROP POLICY IF EXISTS "Admins and managers can insert audit events" ON public.module_audit_events';
    
    EXECUTE 'CREATE POLICY "Admins and managers can view audit events"
      ON public.module_audit_events
      FOR SELECT
      USING (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role)
      )';
    
    EXECUTE 'CREATE POLICY "Admins and managers can insert audit events"
      ON public.module_audit_events
      FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role)
      )';
  END IF;
END $$;

-- 6. conversation_participants - Users see their own participation
-- ============================================
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can view all participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can manage their own participations" ON public.conversation_participants;

-- Users can view their own participation records or if they're platform/office admins
CREATE POLICY "Users can view their own participations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can insert themselves as participants, or admins can add anyone
CREATE POLICY "Users can create their own participation"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can update their own participation settings (muted, last_read_at)
CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role) OR
    has_role(auth.uid(), 'office_manager'::app_role)
  );

-- Users can delete their own participation (leave conversation)
CREATE POLICY "Users can delete their own participation"
  ON public.conversation_participants
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- 7. task_activity_v2 - Users see activity for tasks they have access to
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'task_activity_v2') THEN
    EXECUTE 'ALTER TABLE public.task_activity_v2 ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can view task activity for accessible tasks" ON public.task_activity_v2';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create task activity" ON public.task_activity_v2';
    
    -- Users can view task activity if they have access to the task
    -- This checks if the task's team_id matches teams the user is a member of
    EXECUTE 'CREATE POLICY "Users can view task activity for accessible tasks"
      ON public.task_activity_v2
      FOR SELECT
      USING (
        has_role(auth.uid(), ''platform_admin''::app_role) OR
        has_role(auth.uid(), ''office_manager''::app_role) OR
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_activity_v2.task_id
          AND tasks.team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
          )
        )
      )';
    
    -- Users can create activity for tasks they have access to
    EXECUTE 'CREATE POLICY "Users can create task activity"
      ON public.task_activity_v2
      FOR INSERT
      WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM tasks
          WHERE tasks.id = task_activity_v2.task_id
          AND tasks.team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
END $$;