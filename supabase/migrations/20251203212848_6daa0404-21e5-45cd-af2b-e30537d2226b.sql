-- =====================================================
-- FIX REMAINING 5 TABLES WITHOUT RLS POLICIES
-- =====================================================

-- admin_activity_log - Platform admin only
CREATE POLICY "Platform admins can view admin activity" ON admin_activity_log
  FOR SELECT USING (has_role(auth.uid(), 'platform_admin') OR user_id = auth.uid());

CREATE POLICY "Users can log own activity" ON admin_activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- provider_categories - Agency-scoped
CREATE POLICY "Users can view provider categories" ON provider_categories
  FOR SELECT USING (
    agency_id IS NULL 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "Office managers can manage provider categories" ON provider_categories
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can update provider categories" ON provider_categories
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can delete provider categories" ON provider_categories
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

-- task_activity_log - Task-scoped (via task_id)
CREATE POLICY "Team members can view task activity" ON task_activity_log
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can log task activity" ON task_activity_log
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- task_projects - Team-scoped
CREATE POLICY "Team members can view task projects" ON task_projects
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can create task projects" ON task_projects
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can update task projects" ON task_projects
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can delete task projects" ON task_projects
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- user_bug_points - User rewards
CREATE POLICY "Users can view own bug points" ON user_bug_points
  FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can award bug points" ON user_bug_points
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can update bug points" ON user_bug_points
  FOR UPDATE USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can delete bug points" ON user_bug_points
  FOR DELETE USING (has_role(auth.uid(), 'platform_admin'));