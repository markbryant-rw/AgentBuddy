# Task Permissions Diagnostic Report

## Problem Summary
Users cannot create, move, or complete tasks in the Projects module.

## Root Causes Identified

### 1. ✅ CONFIRMED: `tasks` table UPDATE policy restriction
**Table:** `tasks`
**Issue:** The UPDATE policy has `AND transaction_id IS NULL` in the USING clause
**Impact:** Blocks ALL task updates because non-transaction tasks have `NULL` transaction_id
**Status:** Fixed in migration `20251127010000_fix_all_task_permissions_v2.sql`

### 2. ✅ CONFIRMED: `task_boards` table has NO RLS policies
**Table:** `task_boards`
**Issue:** RLS is ENABLED but there are ZERO policies
**Impact:** Blocks all access to boards - users can't view, create, update, or delete boards
**Status:** Fixed in migration `20251127010000_fix_all_task_permissions_v2.sql`

### 3. ✅ CONFIRMED: `task_lists` table has NO RLS policies
**Table:** `task_lists`
**Issue:** RLS is ENABLED but there are ZERO policies
**Impact:** Critical blocker - users can't:
  - View lists (needed to display tasks)
  - Create tasks (requires valid `list_id`)
  - Move tasks (requires updating `list_id`)
**Status:** Fixed in migration `20251127010000_fix_all_task_permissions_v2.sql`

### 4. ✅ CONFIRMED: `task_activity` table has NO RLS policies
**Table:** `task_activity`
**Issue:** RLS is ENABLED but there are ZERO policies
**Impact:** Task activity logging fails silently
  - Used by `useTaskActivity` hook
  - Frontend tries to SELECT activity logs
  - May cause secondary failures when updating tasks
**Status:** Fixed in migration `20251127010000_fix_all_task_permissions_v2.sql`

## Tables with RLS Enabled (from schema)

```sql
-- These 4 tables have RLS enabled:
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;    -- ❌ NO POLICIES
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;     -- ❌ NO POLICIES
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;          -- ⚠️  HAS POLICIES (but UPDATE is broken)
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;  -- ❌ NO POLICIES
```

## Frontend Code Analysis

### Files Affected
- `src/hooks/useTasks.tsx` - Tries to INSERT/UPDATE tasks (fails due to tasks & task_lists policies)
- `src/hooks/useTaskBoards.tsx` - Tries to SELECT/INSERT task_boards (fails due to no policies)
- `src/hooks/useTaskActivity.tsx` - Tries to SELECT task_activity (fails due to no policies)
- `src/pages/TaskProjects.tsx` - Displays boards (fails to load)
- `src/pages/TaskProjectBoard.tsx` - Displays tasks within a board (fails to load)

### Error Flow
1. User clicks "Create Task" → INSERT into `tasks` requires `list_id`
2. App needs to fetch lists → SELECT from `task_lists` → **BLOCKED (no SELECT policy)**
3. If lists were readable, creating task would fail anyway due to UPDATE policy restriction
4. Task activity logging also fails → SELECT/INSERT from `task_activity` → **BLOCKED (no policies)**

## Migration History (Incomplete Fixes)

Several partial migrations were created but didn't fix all issues:

1. `20251125173342_fix_task_board_permissions.sql` - Partial fix
2. `20251126000000_add_task_boards_lists_rls_policies.sql` - Added some policies (may not have been applied)
3. `20251126005730_ea9e5acf-4e51-4050-bf93-a106bcf8c1a5.sql` - Fixed tasks UPDATE policy
4. `20251126233000_fix_task_update_permissions.sql` - Also tried to fix tasks UPDATE
5. `20251127000000_fix_all_task_permissions.sql` - Comprehensive fix (but missing task_activity)

## Final Comprehensive Fix

**Migration:** `20251127010000_fix_all_task_permissions_v2.sql`

This migration includes:

### Part 1: Fix `tasks` UPDATE policy
- Removes `AND transaction_id IS NULL` restriction
- Allows team members to update ALL their team's tasks
- Transaction filtering happens at application level

### Part 2: Add `task_boards` policies (4 total)
- SELECT: View boards in their team
- INSERT: Create boards for their team
- UPDATE: Update their team's boards
- DELETE: Delete their team's boards

### Part 3: Add `task_lists` policies (4 total)
- SELECT: View shared lists OR private lists they created
- INSERT: Create lists for their team
- UPDATE: Update shared lists OR private lists they created
- DELETE: Delete shared lists OR private lists they created

### Part 4: Add `task_activity` policies (2 total)
- SELECT: View activity for tasks they can access
- INSERT: Create activity records for tasks in their team

### Part 5: Verification
- Automatically verifies all policies were created
- Checks that transaction_id restriction was removed
- Raises errors if any policy creation failed
- Shows success message with summary

## How to Apply the Fix

⚠️ **IMPORTANT: This project uses Lovable Cloud**

You do NOT have direct Supabase access. Migrations are applied automatically by Lovable.

### ✅ For Lovable Cloud Users:

See **[LOVABLE_DEPLOYMENT_GUIDE.md](./LOVABLE_DEPLOYMENT_GUIDE.md)** for complete deployment instructions.

**Quick steps:**
1. Merge the PR from `claude/fix-task-permissions-01MbXqsHnZzLKsq4qt3QwnJo` to main
2. Lovable automatically deploys and runs migrations (2-5 minutes)
3. Hard refresh browser (Ctrl+Shift+R)
4. Test task operations (see [VERIFY_FIX_WORKING.md](./VERIFY_FIX_WORKING.md))

### ❌ Do NOT Use These (They Won't Work on Lovable):
- ❌ `supabase db push` - No Supabase CLI access
- ❌ Supabase Dashboard SQL Editor - No direct access
- ❌ `psql` commands - No direct database access

Lovable handles everything automatically when you deploy!

## Verification Queries

⚠️ **Note:** These SQL queries require direct Supabase access, which you don't have on Lovable.

Instead, use the **browser-based verification** in [VERIFY_FIX_WORKING.md](./VERIFY_FIX_WORKING.md).

If you do have SQL Editor access, these queries can verify the migration:

### 1. Check migration was applied
```sql
SELECT version, name, executed_at
FROM supabase_migrations.schema_migrations
WHERE version = '20251127010000'
ORDER BY executed_at DESC;
```

### 2. Verify all policies exist
```sql
-- Should return 14 total policies across the 4 tables
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('tasks', 'task_boards', 'task_lists', 'task_activity')
GROUP BY tablename
ORDER BY tablename;

-- Expected output:
-- task_activity: 2 policies
-- task_boards: 4 policies
-- task_lists: 4 policies
-- tasks: 5 policies (includes the fixed UPDATE policy + others)
```

### 3. Verify tasks UPDATE policy is fixed
```sql
SELECT
  policyname,
  CASE
    WHEN qual::text LIKE '%transaction_id IS NULL%'
    THEN '❌ STILL HAS RESTRICTION'
    ELSE '✅ FIXED'
  END as status
FROM pg_policies
WHERE tablename = 'tasks' AND policyname = 'Team members can update team tasks';

-- Expected: ✅ FIXED
```

### 4. List all policies
```sql
SELECT
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('task_boards', 'task_lists', 'task_activity')
ORDER BY tablename, cmd, policyname;
```

## Testing After Migration

Test these operations in order:

### 1. View Boards (Tests: task_boards SELECT)
- Go to Projects page
- Should see list of boards
- **If fails:** task_boards SELECT policy not working

### 2. View Lists (Tests: task_lists SELECT)
- Click on a board
- Should see lists (To Do, In Progress, Done, etc.)
- **If fails:** task_lists SELECT policy not working

### 3. Create Task (Tests: tasks INSERT, task_lists SELECT)
- Click "+" to add a task
- Fill in task details
- Click Create
- **If fails:** Check browser console for specific error

### 4. Move Task (Tests: tasks UPDATE, task_lists SELECT)
- Drag a task from one list to another
- Should update position
- **If fails:** tasks UPDATE policy may still have restriction

### 5. Complete Task (Tests: tasks UPDATE)
- Click checkbox on a task
- Should mark as complete
- **If fails:** tasks UPDATE policy not working

### 6. View Task Activity (Tests: task_activity SELECT)
- Open a task
- Check if activity log is visible
- **If fails:** task_activity SELECT policy not working

## Browser Console Errors to Check

Look for these specific error messages in browser console (F12):

### RLS Policy Errors
```
new row violates row-level security policy for table "tasks"
new row violates row-level security policy for table "task_boards"
new row violates row-level security policy for table "task_lists"
new row violates row-level security policy for table "task_activity"
```

### Permission Errors
```
permission denied for table tasks
permission denied for table task_boards
permission denied for table task_lists
permission denied for table task_activity
```

### Application Errors (from useTasks.tsx)
```
You don't have permission to move this task
You don't have permission to complete this task
Failed to create task
No rows were updated - you may not have permission
```

## Quick Diagnostic Script

Run this in Supabase SQL Editor for a complete diagnosis:

```sql
-- Run the diagnostic_rls_check.sql file created earlier
-- Or copy/paste this quick check:

SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) = 0
      THEN '❌ BLOCKING: RLS enabled but no policies'
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) > 0
      THEN '✅ OK: Has ' || COALESCE(p.policy_count, 0) || ' policies'
    ELSE '⚠️  RLS disabled'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN ('tasks', 'task_boards', 'task_lists', 'task_activity')
ORDER BY t.tablename;
```

## Summary

**Problem:** 4 separate RLS policy issues blocking all task operations
**Solution:** Single comprehensive migration fixing all 4 issues
**Migration File:** `20251127010000_fix_all_task_permissions_v2.sql`
**Total Policies Added:** 10 new policies across 3 tables + 1 policy fixed
**Expected Outcome:** Users can create, move, complete tasks without permission errors

---

**Next Steps:**
1. Apply the migration using one of the methods above
2. Run verification queries to confirm policies exist
3. Test task operations in the Projects module
4. Check browser console for any remaining errors
