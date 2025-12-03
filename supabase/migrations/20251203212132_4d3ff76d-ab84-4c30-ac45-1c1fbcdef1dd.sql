-- =====================================================
-- Fix Task System RLS Policies (Corrected)
-- =====================================================

-- =====================================================
-- 1. daily_planner_items - Add all CRUD policies
-- =====================================================

CREATE POLICY "Team members can view planner items" ON daily_planner_items
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Team members can create planner items" ON daily_planner_items
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Team members can update planner items" ON daily_planner_items
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Team members can delete planner items" ON daily_planner_items
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- =====================================================
-- 2. tasks - Add missing INSERT/UPDATE/DELETE policies
-- =====================================================

CREATE POLICY "Team members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can update tasks" ON tasks
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can delete tasks" ON tasks
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- 3. task_lists - Add SELECT and ALL policies
-- =====================================================

CREATE POLICY "Team members can view task lists" ON task_lists
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team members can manage task lists" ON task_lists
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- 4. task_assignees - Add policy for task assignee management
-- =====================================================

CREATE POLICY "Team members can manage task assignees" ON task_assignees
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- 5. task_tags - Uses agency_id, not team_id
-- =====================================================

CREATE POLICY "Users can manage task tags in their agency" ON task_tags
  FOR ALL USING (
    agency_id = get_user_agency_id(auth.uid())
  );

-- =====================================================
-- 6. task_comments - Add policies
-- =====================================================

CREATE POLICY "Team members can view task comments" ON task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can add task comments" ON task_comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own task comments" ON task_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own task comments" ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 7. task_attachments - Add policies
-- =====================================================

CREATE POLICY "Team members can view task attachments" ON task_attachments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can add task attachments" ON task_attachments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own task attachments" ON task_attachments
  FOR DELETE USING (uploaded_by = auth.uid());