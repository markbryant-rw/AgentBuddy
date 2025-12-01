-- COMPREHENSIVE FIX for task permissions in Projects module
-- This fixes all permission issues for creating, moving, and completing tasks
--
-- Root causes:
-- 1. tasks table UPDATE policy had "AND transaction_id IS NULL" restriction
-- 2. task_boards and task_lists tables have RLS enabled but NO policies (blocking all access)
--
-- Without access to task_lists, users can't create/move tasks because:
-- - Creating tasks requires a valid list_id
-- - Moving tasks requires updating list_id
-- - The app can't read lists to verify they exist

-- ========================================
-- PART 1: Fix tasks table UPDATE policy
-- ========================================

DROP POLICY IF EXISTS "Team members can update team tasks" ON public.tasks;

CREATE POLICY "Team members can update team tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ========================================
-- PART 2: Add RLS policies for task_boards
-- ========================================

-- Drop any existing policies (in case of partial migration)
DROP POLICY IF EXISTS "Team members can view team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can create team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can update team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can delete team task boards" ON public.task_boards;

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
-- PART 3: Add RLS policies for task_lists
-- ========================================

-- Drop any existing policies (in case of partial migration)
DROP POLICY IF EXISTS "Team members can view team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can create team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete team task lists" ON public.task_lists;

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

-- ========================================
-- PART 4: Verification
-- ========================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Verify tasks UPDATE policy exists
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Failed to create tasks UPDATE policy';
  END IF;

  -- Verify task_boards policies exist (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_boards';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Failed to create all task_boards policies (expected 4, got %)', policy_count;
  END IF;

  -- Verify task_lists policies exist (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_lists';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Failed to create all task_lists policies (expected 4, got %)', policy_count;
  END IF;

  RAISE NOTICE '✅ All RLS policies successfully created!';
  RAISE NOTICE '  - tasks: UPDATE policy fixed (transaction_id restriction removed)';
  RAISE NOTICE '  - task_boards: 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - task_lists: 4 policies created (SELECT, INSERT, UPDATE, DELETE)';
END $$;
