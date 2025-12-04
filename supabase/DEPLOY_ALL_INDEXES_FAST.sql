-- ============================================================================
-- AGENTBUDDY PERFORMANCE OPTIMIZATION: 35 DATABASE INDEXES
-- FAST DEPLOYMENT VERSION (Non-Concurrent)
-- ============================================================================
--
-- This version creates indexes WITHOUT CONCURRENTLY for faster deployment
-- in development/staging environments or during maintenance windows.
--
-- ⚠️  WARNING: This will briefly lock tables during index creation
-- ⚠️  Best used during: Low-traffic periods or staging/development
-- ⚠️  Production: Schedule during maintenance window (2-3 AM)
--
-- Expected Impact: 90% faster queries (21.6s → 2.2s across affected queries)
-- Expected Time: 2-5 minutes total
--
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and click "Run"
-- 4. Wait for completion (should be quick)
-- 5. Run verification queries at the bottom
--
-- ============================================================================

-- ============================================================================
-- GROUP 1: FOREIGN KEY INDEXES (15 indexes)
-- Impact: 85-93% faster queries, most critical for RLS policies
-- ============================================================================

-- Conversation & Messaging Indexes (Critical for message loading)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
  ON public.conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
  ON public.conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages(sender_id);

-- Knowledge Base Indexes (Critical for KB queries)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_categories_agency_id
  ON public.knowledge_base_categories(agency_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_cards_agency_id
  ON public.knowledge_base_cards(agency_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_playbooks_agency_id
  ON public.knowledge_base_playbooks(agency_id);

-- Goals & Reviews Indexes (Critical for PLAN module)
CREATE INDEX IF NOT EXISTS idx_goals_team_id
  ON public.goals(team_id);

CREATE INDEX IF NOT EXISTS idx_goals_user_id
  ON public.goals(user_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_team_id
  ON public.quarterly_reviews(team_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_user_id
  ON public.quarterly_reviews(user_id);

-- Service Provider Indexes
CREATE INDEX IF NOT EXISTS idx_service_providers_agency_id
  ON public.service_providers(agency_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_notes_provider_id
  ON public.service_provider_notes(provider_id);

CREATE INDEX IF NOT EXISTS idx_service_provider_reviews_provider_id
  ON public.service_provider_reviews(provider_id);

-- Coaching Indexes
CREATE INDEX IF NOT EXISTS idx_coaching_conversation_messages_conversation_id
  ON public.coaching_conversation_messages(conversation_id);

-- ============================================================================
-- GROUP 2: WHERE CLAUSE INDEXES (10 indexes)
-- Impact: 89-90% faster filtered queries
-- ============================================================================

-- Daily Activities Indexes (Critical for activity tracking)
CREATE INDEX IF NOT EXISTS idx_daily_activities_user_id
  ON public.daily_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_activities_team_id
  ON public.daily_activities(team_id);

-- Note Sharing Indexes
CREATE INDEX IF NOT EXISTS idx_note_shares_user_id
  ON public.note_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_note_shares_note_id
  ON public.note_shares(note_id);

-- Bug Reports & Feature Requests Indexes (Critical for feedback system)
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id
  ON public.bug_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_bug_reports_team_id
  ON public.bug_reports(team_id);

CREATE INDEX IF NOT EXISTS idx_feature_requests_team_id
  ON public.feature_requests(team_id);

-- Listing Comments Indexes (Critical for RLS policy performance)
CREATE INDEX IF NOT EXISTS idx_listing_comments_listing_id
  ON public.listing_comments(listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_comments_user_id
  ON public.listing_comments(user_id);

-- Help Requests Index
CREATE INDEX IF NOT EXISTS idx_help_requests_team_id
  ON public.help_requests(team_id);

-- ============================================================================
-- GROUP 3: ORDER BY INDEXES (4 indexes)
-- Impact: 89-91% faster sorted queries
-- All use DESC for reverse chronological display
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_activities_activity_date
  ON public.daily_activities(activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_logged_appraisals_appraisal_date
  ON public.logged_appraisals(appraisal_date DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at
  ON public.admin_activity_log(created_at DESC);

-- ============================================================================
-- GROUP 4: COMPOSITE INDEXES (6 indexes)
-- Impact: 89-94% faster multi-column queries
-- CRITICAL: team_members composite used in 30+ RLS policies!
-- ============================================================================

-- MOST CRITICAL INDEX - Used in 30+ RLS policies
CREATE INDEX IF NOT EXISTS idx_team_members_composite
  ON public.team_members(team_id, user_id);

CREATE INDEX IF NOT EXISTS idx_coaching_conversations_user_created_at
  ON public.coaching_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_help_requests_status_team
  ON public.help_requests(status, team_id);

CREATE INDEX IF NOT EXISTS idx_listing_pipeline_team_status
  ON public.listings_pipeline(team_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_team_status_due_date
  ON public.tasks(team_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date
  ON public.kpi_entries(user_id, date DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- These will run automatically after index creation
-- ============================================================================

-- Count total indexes created
SELECT
  COUNT(*) as total_new_indexes,
  CASE
    WHEN COUNT(*) = 35 THEN '✓ All 35 indexes created successfully!'
    WHEN COUNT(*) > 0 THEN '✓ Created ' || COUNT(*) || ' indexes (some may have already existed)'
    ELSE '✗ No indexes created - check for errors above'
  END as status
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
  AND indexname IN (
    'idx_conversation_participants_user_id',
    'idx_conversation_participants_conversation_id',
    'idx_messages_conversation_id',
    'idx_messages_sender_id',
    'idx_knowledge_base_categories_agency_id',
    'idx_knowledge_base_cards_agency_id',
    'idx_knowledge_base_playbooks_agency_id',
    'idx_goals_team_id',
    'idx_goals_user_id',
    'idx_quarterly_reviews_team_id',
    'idx_quarterly_reviews_user_id',
    'idx_service_providers_agency_id',
    'idx_service_provider_notes_provider_id',
    'idx_service_provider_reviews_provider_id',
    'idx_coaching_conversation_messages_conversation_id',
    'idx_daily_activities_user_id',
    'idx_daily_activities_team_id',
    'idx_note_shares_user_id',
    'idx_note_shares_note_id',
    'idx_bug_reports_user_id',
    'idx_bug_reports_team_id',
    'idx_feature_requests_team_id',
    'idx_listing_comments_listing_id',
    'idx_listing_comments_user_id',
    'idx_help_requests_team_id',
    'idx_messages_created_at',
    'idx_daily_activities_activity_date',
    'idx_logged_appraisals_appraisal_date',
    'idx_admin_activity_log_created_at',
    'idx_team_members_composite',
    'idx_coaching_conversations_user_created_at',
    'idx_help_requests_status_team',
    'idx_listing_pipeline_team_status',
    'idx_tasks_team_status_due_date',
    'idx_kpi_entries_user_date'
  );

-- Verify critical indexes exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_composite')
    THEN '✓ CRITICAL: team_members composite index exists'
    ELSE '✗ ERROR: team_members composite index missing'
  END as team_members_check,

  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_conversation_id')
    THEN '✓ Messages conversation_id index exists'
    ELSE '✗ ERROR: Messages conversation_id index missing'
  END as messages_check,

  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tasks_team_status_due_date')
    THEN '✓ Tasks composite index exists'
    ELSE '✗ ERROR: Tasks composite index missing'
  END as tasks_check;

-- List all newly created indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Expected result: "✓ All 35 indexes created successfully!"
--
-- Next steps:
-- 1. Test query performance in your application
-- 2. Monitor for 24 hours
-- 3. Run performance testing queries from INDEX_MIGRATIONS_README.md
-- 4. Expected improvements:
--    - Team membership checks: 400ms → 25ms (94% faster)
--    - Message loading: 1200ms → 80ms (93% faster)
--    - Knowledge base queries: 800ms → 120ms (85% faster)
-- ============================================================================
