-- ==========================================
-- FINAL COMPREHENSIVE FIX for all task permissions
-- ==========================================
--
-- This migration fixes ALL permission issues preventing users from
-- creating, moving, and completing tasks in the Projects module.
--
-- ROOT CAUSES IDENTIFIED:
-- 1. tasks table: UPDATE policy had "AND transaction_id IS NULL" restriction
-- 2. task_boards: RLS enabled but NO policies (blocks all access)
-- 3. task_lists: RLS enabled but NO policies (blocks all access)
-- 4. task_activity: RLS enabled but NO policies (blocks reads/writes)
--
-- The task_activity table is used by the frontend to log task changes,
-- and without SELECT/INSERT policies, task operations fail silently.
--
-- ==========================================

-- ==========================================
-- PART 1: Fix tasks table UPDATE policy
-- ==========================================

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

-- ==========================================
-- PART 2: Add RLS policies for task_boards
-- ==========================================

DROP POLICY IF EXISTS "Team members can view team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can create team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can update team task boards" ON public.task_boards;
DROP POLICY IF EXISTS "Team members can delete team task boards" ON public.task_boards;

-- SELECT: View boards
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

-- INSERT: Create boards
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

-- UPDATE: Update boards
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

-- DELETE: Delete boards
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

-- ==========================================
-- PART 3: Add RLS policies for task_lists
-- ==========================================

DROP POLICY IF EXISTS "Team members can view team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can create team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update team task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete team task lists" ON public.task_lists;

-- SELECT: View lists (respects is_shared for private lists)
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

-- INSERT: Create lists
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

-- UPDATE: Update lists
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

-- DELETE: Delete lists
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

-- ==========================================
-- PART 4: Add RLS policies for task_activity
-- ==========================================

DROP POLICY IF EXISTS "Users can view task activity for their tasks" ON public.task_activity;
DROP POLICY IF EXISTS "Users can create task activity for their tasks" ON public.task_activity;

-- SELECT: View activity for tasks the user has access to
CREATE POLICY "Users can view task activity for their tasks"
ON public.task_activity FOR SELECT
TO authenticated
USING (
  -- Can view activity for tasks they can see
  task_id IN (
    SELECT id FROM tasks
    WHERE created_by = auth.uid()
       OR assigned_to = auth.uid()
       OR team_id IN (
         SELECT team_id
         FROM team_members
         WHERE user_id = auth.uid()
       )
  )
);

-- INSERT: Create activity records
CREATE POLICY "Users can create task activity for their tasks"
ON public.task_activity FOR INSERT
TO authenticated
WITH CHECK (
  -- Can create activity for tasks they can access
  user_id = auth.uid()
  AND task_id IN (
    SELECT id FROM tasks
    WHERE team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
    )
  )
);

-- ==========================================
-- PART 5: Verification
-- ==========================================

DO $$
DECLARE
  policy_count INT;
  error_msg TEXT;
BEGIN
  -- Check tasks UPDATE policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF policy_count = 0 THEN
    RAISE EXCEPTION '❌ FAILED: tasks UPDATE policy not created';
  END IF;

  -- Check tasks UPDATE policy doesn't have transaction_id restriction
  SELECT qual::text INTO error_msg
  FROM pg_policies
  WHERE tablename = 'tasks'
  AND policyname = 'Team members can update team tasks';

  IF error_msg LIKE '%transaction_id IS NULL%' THEN
    RAISE EXCEPTION '❌ FAILED: tasks UPDATE policy still has transaction_id restriction';
  END IF;

  -- Check task_boards policies (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_boards';

  IF policy_count < 4 THEN
    RAISE EXCEPTION '❌ FAILED: task_boards policies (expected 4, got %)', policy_count;
  END IF;

  -- Check task_lists policies (should be 4)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_lists';

  IF policy_count < 4 THEN
    RAISE EXCEPTION '❌ FAILED: task_lists policies (expected 4, got %)', policy_count;
  END IF;

  -- Check task_activity policies (should be 2)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_activity';

  IF policy_count < 2 THEN
    RAISE EXCEPTION '❌ FAILED: task_activity policies (expected 2, got %)', policy_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL RLS POLICIES SUCCESSFULLY CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✅ tasks: UPDATE policy (removed transaction_id restriction)';
  RAISE NOTICE '  ✅ task_boards: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✅ task_lists: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  ✅ task_activity: 2 policies (SELECT, INSERT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  ✅ Create tasks';
  RAISE NOTICE '  ✅ Move tasks between lists';
  RAISE NOTICE '  ✅ Complete/uncomplete tasks';
  RAISE NOTICE '  ✅ View task activity logs';
  RAISE NOTICE '';
END $$;
