-- Add missing RLS policies for task_boards and task_lists tables
-- These tables have RLS enabled but no policies, which blocks all access

-- ========================================
-- RLS Policies for task_boards
-- ========================================

-- Allow team members to view boards
CREATE POLICY "Team members can view team task boards"
  ON public.task_boards FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow team members to create boards for their team
CREATE POLICY "Team members can create team task boards"
  ON public.task_boards FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Allow team members to update their team's boards
CREATE POLICY "Team members can update team task boards"
  ON public.task_boards FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Allow team members to delete their team's boards
CREATE POLICY "Team members can delete team task boards"
  ON public.task_boards FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- ========================================
-- RLS Policies for task_lists
-- ========================================

-- Allow team members to view lists (respecting is_shared for private lists)
CREATE POLICY "Team members can view team task lists"
  ON public.task_lists FOR SELECT
  TO authenticated
  USING (
    -- Shared lists: accessible by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: accessible only by creator
    (is_shared = false AND created_by = auth.uid())
  );

-- Allow team members to create lists for their team
CREATE POLICY "Team members can create team task lists"
  ON public.task_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Allow team members to update lists they have access to
CREATE POLICY "Team members can update team task lists"
  ON public.task_lists FOR UPDATE
  TO authenticated
  USING (
    -- Shared lists: updatable by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: updatable only by creator
    (is_shared = false AND created_by = auth.uid())
  );

-- Allow team members to delete lists they have access to
CREATE POLICY "Team members can delete team task lists"
  ON public.task_lists FOR DELETE
  TO authenticated
  USING (
    -- Shared lists: deletable by all team members
    (is_shared = true AND team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    ))
    OR
    -- Private lists: deletable only by creator
    (is_shared = false AND created_by = auth.uid())
  );
