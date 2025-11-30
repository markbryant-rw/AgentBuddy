-- ==========================================
-- COMPREHENSIVE RLS DIAGNOSTIC QUERY
-- ==========================================
-- Run this in Supabase SQL Editor to diagnose permission issues

-- ==========================================
-- 1. CHECK IF MIGRATION WAS APPLIED
-- ==========================================
\echo '=========================================='
\echo '1. CHECKING MIGRATION HISTORY'
\echo '=========================================='

-- Check if our migration exists in the migrations table
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version LIKE '2025112%'
ORDER BY version DESC
LIMIT 10;

-- ==========================================
-- 2. CHECK task_boards POLICIES (Should be 4)
-- ==========================================
\echo ''
\echo '=========================================='
\echo '2. TASK_BOARDS RLS POLICIES'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'task_boards'
ORDER BY policyname;

-- Count policies
SELECT
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE tablename = 'task_boards';

-- ==========================================
-- 3. CHECK task_lists POLICIES (Should be 4)
-- ==========================================
\echo ''
\echo '=========================================='
\echo '3. TASK_LISTS RLS POLICIES'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'task_lists'
ORDER BY policyname;

-- Count policies
SELECT
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE tablename = 'task_lists';

-- ==========================================
-- 4. CHECK tasks TABLE UPDATE POLICIES
-- ==========================================
\echo ''
\echo '=========================================='
\echo '4. TASKS TABLE UPDATE POLICIES'
\echo '=========================================='

SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'tasks'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Check if transaction_id restriction still exists
SELECT
  policyname,
  CASE
    WHEN qual::text LIKE '%transaction_id IS NULL%' THEN '❌ PROBLEM: Contains transaction_id IS NULL'
    ELSE '✅ OK: No transaction_id restriction'
  END as status,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'tasks'
  AND cmd = 'UPDATE';

-- ==========================================
-- 5. ALL tasks TABLE POLICIES
-- ==========================================
\echo ''
\echo '=========================================='
\echo '5. ALL TASKS TABLE POLICIES'
\echo '=========================================='

SELECT
  policyname,
  cmd as operation,
  substring(qual::text, 1, 100) as using_expression_preview
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd, policyname;

-- ==========================================
-- 6. FIND TABLES WITH RLS BUT NO POLICIES
-- ==========================================
\echo ''
\echo '=========================================='
\echo '6. TABLES WITH RLS ENABLED BUT NO POLICIES'
\echo '=========================================='

SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND COALESCE(p.policy_count, 0) = 0
ORDER BY t.tablename;

-- ==========================================
-- 7. TASK-RELATED TABLES RLS STATUS
-- ==========================================
\echo ''
\echo '=========================================='
\echo '7. TASK-RELATED TABLES RLS STATUS'
\echo '=========================================='

SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) = 0 THEN '❌ BLOCKING: RLS enabled but no policies'
    WHEN t.rowsecurity = true AND COALESCE(p.policy_count, 0) > 0 THEN '✅ OK: Has policies'
    WHEN t.rowsecurity = false THEN '⚠️  WARNING: RLS disabled'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename LIKE '%task%'
ORDER BY t.tablename;

-- ==========================================
-- 8. CHECK FOR task_assignees POLICIES
-- ==========================================
\echo ''
\echo '=========================================='
\echo '8. TASK_ASSIGNEES RLS STATUS'
\echo '=========================================='

SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename = 'task_assignees';

SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'task_assignees'
ORDER BY cmd, policyname;

-- ==========================================
-- 9. SUMMARY
-- ==========================================
\echo ''
\echo '=========================================='
\echo '9. DIAGNOSTIC SUMMARY'
\echo '=========================================='

SELECT
  '✅ Expected' as status,
  'task_boards should have 4 policies (SELECT, INSERT, UPDATE, DELETE)' as requirement
UNION ALL
SELECT
  '✅ Expected',
  'task_lists should have 4 policies (SELECT, INSERT, UPDATE, DELETE)'
UNION ALL
SELECT
  '✅ Expected',
  'tasks UPDATE policy should NOT contain "transaction_id IS NULL"'
UNION ALL
SELECT
  '✅ Expected',
  'No task-related tables should have RLS enabled with 0 policies';
