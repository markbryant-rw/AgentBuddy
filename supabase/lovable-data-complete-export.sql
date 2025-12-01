-- ============================================================================
-- LOVABLE CLOUD DATA EXPORT
-- Complete data export for migration to standalone Supabase instance
-- Generated: 2025-11-29
-- 
-- INSTRUCTIONS:
-- 1. First run schema-only.sql on your new Supabase instance
-- 2. Then run this file to import all data
-- 3. All INSERT statements use ON CONFLICT DO NOTHING for idempotency
-- 
-- NOTE: This does NOT include:
-- - auth.users table (managed by Supabase Auth - users must re-register)
-- - Storage files (only URLs are preserved)
-- ============================================================================

BEGIN;

-- Disable triggers temporarily for faster import
SET session_replication_role = replica;

-- ============================================================================
-- FOUNDATION TABLES (No dependencies)
-- ============================================================================

-- agencies
INSERT INTO public.agencies (id, name, slug, bio, brand, brand_color, logo_url, invite_code, office_channel_id, is_archived, created_by, created_at, updated_at) VALUES
('53e24937-c30c-48b6-8876-c100df50b0a6', 'Independent Agents', 'independent-agents', 'A collaborative space for independent real estate agents', 'Independent', '#3b82f6', NULL, 'INDAGENT', NULL, false, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-18 00:57:02.086753+00', '2025-01-18 00:57:02.086753+00'),
('87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'Colliers Test Office', 'colliers-test-office', NULL, NULL, NULL, NULL, 'F5F75OXY', NULL, false, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:18:12.022349+00', '2025-01-20 05:18:12.022349+00')
ON CONFLICT (id) DO NOTHING;

-- subscription_plans
INSERT INTO public.subscription_plans (id, name, description, price_monthly, price_annual, max_users, features, created_at, updated_at) VALUES
('0fe5b5df-1831-4426-88ec-ce83ee0d7f90', 'Enterprise', 'For large organizations', 49900, 499900, NULL, '["unlimited_users","all_modules","priority_support","custom_branding"]', '2025-01-18 00:57:02.072626+00', '2025-01-18 00:57:02.072626+00'),
('5c2e4d0f-e13f-4b76-8f09-1e3a8b6c9d7e', 'Professional', 'For growing teams', 9900, 99900, 50, '["advanced_analytics","priority_support","custom_workflows"]', '2025-01-18 00:57:02.072626+00', '2025-01-18 00:57:02.072626+00'),
('a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d', 'Basic', 'For small teams', 2900, 29900, 10, '["core_modules","email_support","basic_analytics"]', '2025-01-18 00:57:02.072626+00', '2025-01-18 00:57:02.072626+00')
ON CONFLICT (id) DO NOTHING;

-- modules
INSERT INTO public.modules (id, name, description, icon, is_core, created_at) VALUES
('appraisals', 'Appraisals', 'Track and manage property appraisals', 'clipboard-check', true, '2025-01-18 00:57:02.072626+00'),
('coaching', 'Coaching', 'Access AI-powered coaching conversations', 'messages-square', false, '2025-01-18 00:57:02.072626+00'),
('daily-planner', 'Daily Planner', 'Plan and track daily activities', 'calendar-days', true, '2025-01-18 00:57:02.072626+00'),
('feedback-centre', 'Feedback Centre', 'Report bugs and request features', 'message-circle', true, '2025-01-18 00:57:02.072626+00'),
('insights', 'Insights', 'View analytics and performance metrics', 'bar-chart-3', true, '2025-01-18 00:57:02.072626+00'),
('knowledge-base', 'Knowledge Base', 'Access training materials and playbooks', 'book-open', false, '2025-01-18 00:57:02.072626+00'),
('listings', 'Listings Pipeline', 'Manage listing opportunities', 'home', true, '2025-01-18 00:57:02.072626+00'),
('messaging', 'Messaging', 'Team communication and channels', 'message-square', true, '2025-01-18 00:57:02.072626+00'),
('notes', 'Notes', 'Capture and organize notes', 'sticky-note', true, '2025-01-18 00:57:02.072626+00'),
('past-sales', 'Past Sales', 'Track completed transactions', 'check-circle', true, '2025-01-18 00:57:02.072626+00'),
('providers', 'Service Providers', 'Manage service provider contacts', 'users', false, '2025-01-18 00:57:02.072626+00'),
('social', 'Social Feed', 'Team social interactions and celebrations', 'users', false, '2025-01-18 00:57:02.072626+00'),
('tasks', 'Tasks', 'Manage tasks and projects', 'check-square', true, '2025-01-18 00:57:02.072626+00'),
('transactions', 'Transaction Coordinating', 'Coordinate property transactions', 'file-text', true, '2025-01-18 00:57:02.072626+00')
ON CONFLICT (id) DO NOTHING;

-- bug_categories
INSERT INTO public.bug_categories (id, name, description, color, icon, created_at) VALUES
('0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a', 'UI/UX', 'Visual or interaction issues', '#3b82f6', 'layout', '2025-01-18 00:57:02.072626+00'),
('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Performance', 'Speed or loading issues', '#f59e0b', 'zap', '2025-01-18 00:57:02.072626+00'),
('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Data', 'Data inconsistency or loss', '#ef4444', 'database', '2025-01-18 00:57:02.072626+00'),
('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Security', 'Security or privacy concerns', '#dc2626', 'shield', '2025-01-18 00:57:02.072626+00'),
('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'Integration', 'Third-party integration issues', '#8b5cf6', 'plug', '2025-01-18 00:57:02.072626+00')
ON CONFLICT (id) DO NOTHING;

-- provider_categories
INSERT INTO public.provider_categories (id, name, description, icon, color, created_at) VALUES
('accountant', 'Accountant', 'Financial and tax services', 'calculator', '#3b82f6', '2025-01-18 00:57:02.072626+00'),
('builder', 'Builder', 'Construction and renovation', 'hammer', '#f59e0b', '2025-01-18 00:57:02.072626+00'),
('conveyancer', 'Conveyancer', 'Legal property transfer services', 'file-text', '#8b5cf6', '2025-01-18 00:57:02.072626+00'),
('electrician', 'Electrician', 'Electrical services', 'zap', '#eab308', '2025-01-18 00:57:02.072626+00'),
('home-stager', 'Home Stager', 'Property presentation services', 'home', '#ec4899', '2025-01-18 00:57:02.072626+00'),
('inspector', 'Building Inspector', 'Property inspection services', 'search', '#06b6d4', '2025-01-18 00:57:02.072626+00'),
('landscaper', 'Landscaper', 'Garden and outdoor services', 'trees', '#10b981', '2025-01-18 00:57:02.072626+00'),
('mortgage-broker', 'Mortgage Broker', 'Home loan services', 'landmark', '#6366f1', '2025-01-18 00:57:02.072626+00'),
('other', 'Other', 'Other service providers', 'more-horizontal', '#64748b', '2025-01-18 00:57:02.072626+00'),
('painter', 'Painter', 'Painting services', 'paintbrush', '#f97316', '2025-01-18 00:57:02.072626+00'),
('photographer', 'Photographer', 'Property photography', 'camera', '#a855f7', '2025-01-18 00:57:02.072626+00'),
('plumber', 'Plumber', 'Plumbing services', 'droplet', '#0ea5e9', '2025-01-18 00:57:02.072626+00')
ON CONFLICT (id) DO NOTHING;

-- discount_codes
-- (No data in this table)

-- platform_settings
-- (No data in this table)

-- ============================================================================
-- USERS & ROLES
-- ============================================================================

-- profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, bio, phone, birthday, office_id, primary_team_id, invite_code, status, created_at, updated_at, active_office_id, active_role, last_role_switch_at, total_bug_points, onboarding_completed, profile_completion) VALUES
('d74e33d7-f60f-4e30-9496-c12997b6c062', 'mark@markmcveigh.co.nz', 'Mark McVeigh', NULL, NULL, NULL, NULL, '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'fdc66f03-d7b4-4ed7-b5f1-ce2930da6b23', 'MARKMCV1', 'active', '2025-01-18 00:57:02.226986+00', '2025-01-29 04:10:03.708732+00', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', NULL, NULL, 50, true, 40)
ON CONFLICT (id) DO NOTHING;

-- user_roles
INSERT INTO public.user_roles (id, user_id, role, granted_by, granted_at, revoked_at, revoked_by) VALUES
('0c19d7c3-0c0f-41a9-b26f-f9abadaeb1ee', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'team_leader', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:26:09.544879+00', NULL, NULL),
('b8b1f4f8-c3ef-4e8e-9f47-8de2e94b735f', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'platform_admin', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-18 00:57:02.226986+00', NULL, NULL),
('cd1bd4c4-0094-4d1d-8f65-b0a7caf13e42', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'office_manager', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:18:12.034834+00', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- office_manager_assignments
INSERT INTO public.office_manager_assignments (id, user_id, agency_id, assigned_by, assigned_at) VALUES
('bdd98bed-35a4-486e-b5bf-a71e9c8d7a47', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:18:12.034834+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEAMS
-- ============================================================================

-- teams
INSERT INTO public.teams (id, name, agency_id, team_code, bio, logo_url, is_archived, created_by, created_at, updated_at, uses_financial_year, financial_year_start_month, is_personal_team) VALUES
('fdc66f03-d7b4-4ed7-b5f1-ce2930da6b23', 'Mark & Co.', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', '45TDEQCB', NULL, NULL, false, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:26:09.483896+00', '2025-01-20 05:26:09.483896+00', false, 7, false)
ON CONFLICT (id) DO NOTHING;

-- team_members
INSERT INTO public.team_members (id, team_id, user_id, joined_at, access_level) VALUES
('75974d17-88e6-473f-8efe-de63e32a3f5e', 'fdc66f03-d7b4-4ed7-b5f1-ce2930da6b23', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-20 05:26:09.546308+00', 'admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- agency_financials
-- (No data in this table)

-- agency_subscriptions
-- (No data in this table)

-- agency_subscription_plans
-- (No data in this table)

-- ============================================================================
-- MODULE POLICIES
-- ============================================================================

-- module_policies
-- (No data in this table)

-- module_audit_events
-- (No data in this table)

-- module_usage_stats
INSERT INTO public.module_usage_stats (id, user_id, module_id, visit_count, last_visited_at) VALUES
('29ac9ccb-9be2-4baf-887b-d4f89f60d026', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'feedback-centre', 12, '2025-01-29 03:10:16.906614+00'),
('5a3d0d6b-6bc0-433f-874f-7c6e9a9b7653', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'transactions', 2, '2025-01-28 02:37:30.043849+00'),
('612ae6c9-d49b-49b8-b084-e2bd0e99aa4a', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'tasks', 2, '2025-01-29 01:20:19.826936+00'),
('bd26bf56-94e4-4f75-be4d-6a7a13ff1e5d', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'daily-planner', 6, '2025-01-28 06:37:51.481976+00'),
('f8e87ae5-5006-4f10-a2cd-c1ed887ed0de', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'appraisals', 1, '2025-01-28 02:37:20.825558+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MESSAGING
-- ============================================================================

-- conversations
-- (No data in this table)

-- conversation_participants
-- (No data in this table)

-- messages
-- (No data in this table)

-- ============================================================================
-- LEAD SOURCES
-- ============================================================================

-- lead_source_options
INSERT INTO public.lead_source_options (id, agency_id, value, label, sort_order, is_active, is_default, created_at, updated_at) VALUES
('0560e1e5-ff68-4db4-8bb5-6e2ec9fbfbb6', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'database', 'Database', 8, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('1a4c0cf8-58db-422f-98e7-0f2d05bd6541', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'other', 'Other', 10, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('5379e1eb-7fc8-4e63-b1c1-e1285b34edf2', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'open_home', 'Open Home', 7, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('65f0d3bc-96f4-4a40-b4cb-de19e6a13c16', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'referral', 'Referral', 1, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('6e4ea9fe-c36a-41fd-9ba0-7f062c4b68cc', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'social_media', 'Social Media', 5, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('99e66d80-67a1-4cc2-b0c9-f3d3fe4e0fe7', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'sign_board', 'Sign Board', 6, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('c4e5abca-7f1a-453b-a0f8-d5f4a82c30a8', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'cold_call', 'Cold Call', 3, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('c7aa2d96-c96d-4e0c-9237-35f1ec7bc1de', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'online_inquiry', 'Online Inquiry', 4, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('deb67d8c-adab-4f97-9aea-c0d7ae72da9a', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'networking', 'Networking Event', 9, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00'),
('ff1737d1-c844-492a-9d36-b8af5854ead9', '87f34f27-5b01-4e50-ab13-5fd6b6be44d3', 'past_client', 'Past Client', 2, true, true, '2025-01-20 05:18:12.034834+00', '2025-01-20 05:18:12.034834+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PROPERTY PIPELINE
-- ============================================================================

-- logged_appraisals
-- (No data in this table)

-- listings_pipeline
-- (No data in this table)

-- listing_comments
-- (No data in this table)

-- listing_descriptions
-- (No data in this table)

-- listing_pipeline_stats
-- (No data in this table)

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

-- transactions
-- (No data in this table)

-- transaction_milestones
-- (No data in this table)

-- transaction_links
-- (No data in this table)

-- ============================================================================
-- PAST SALES
-- ============================================================================

-- past_sales
-- (No data in this table)

-- ============================================================================
-- VENDOR REPORTS
-- ============================================================================

-- vendor_reports
-- (No data in this table)

-- vendor_report_opens
-- (No data in this table)

-- vendor_report_link_clicks
-- (No data in this table)

-- ============================================================================
-- TASKS
-- ============================================================================

-- task_boards
INSERT INTO public.task_boards (id, title, description, created_by, is_shared, order_position, created_at, updated_at, team_id, is_personal_admin_board, owner_role) VALUES
('8c3c7cf0-0b7a-4ea8-90b0-f63e1aa49c30', 'Platform Tasks', NULL, 'd74e33d7-f60f-4e30-9496-c12997b6c062', false, 0, '2025-01-29 01:20:19.911831+00', '2025-01-29 01:20:19.911831+00', NULL, true, 'platform_admin')
ON CONFLICT (id) DO NOTHING;

-- task_lists
INSERT INTO public.task_lists (id, board_id, team_id, title, description, color, icon, order_position, created_by, created_at, updated_at, is_shared) VALUES
('21bd8a09-0e37-4f74-b2c9-f17bc7bf09c8', '8c3c7cf0-0b7a-4ea8-90b0-f63e1aa49c30', NULL, 'Done', NULL, '#10b981', 'check-circle', 2, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-29 01:20:19.911831+00', '2025-01-29 01:20:19.911831+00', false),
('2ff9a32a-b18c-4e33-bd01-7e11c3eef999', '8c3c7cf0-0b7a-4ea8-90b0-f63e1aa49c30', NULL, 'To Do', NULL, '#3b82f6', 'circle-dashed', 0, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-29 01:20:19.911831+00', '2025-01-29 01:20:19.911831+00', false),
('b2c30cec-3c23-4aef-96e1-d60bd1b1c651', '8c3c7cf0-0b7a-4ea8-90b0-f63e1aa49c30', NULL, 'In Progress', NULL, '#f59e0b', 'clock', 1, 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-29 01:20:19.911831+00', '2025-01-29 01:20:19.911831+00', false)
ON CONFLICT (id) DO NOTHING;

-- task_projects
-- (No data in this table)

-- task_tags
-- (No data in this table)

-- tasks
-- (No data in this table)

-- task_activity
-- (No data in this table)

-- task_assignment_notifications
-- (No data in this table)

-- task_attachments
-- (No data in this table)

-- task_comments
-- (No data in this table)

-- task_followers
-- (No data in this table)

-- task_reminders
-- (No data in this table)

-- task_time_logs
-- (No data in this table)

-- ============================================================================
-- DAILY PLANNER
-- ============================================================================

-- daily_planner_items
-- (No data in this table)

-- daily_planner_assignments
-- (No data in this table)

-- daily_planner_recurring_templates
-- (No data in this table)

-- daily_planner_generated_instances
-- (No data in this table)

-- ============================================================================
-- KPIs & GOALS
-- ============================================================================

-- kpi_entries
-- (No data in this table)

-- kpi_targets
-- (No data in this table)

-- goals
-- (No data in this table)

-- daily_activities
-- (No data in this table)

-- daily_log_tracker
-- (No data in this table)

-- quarterly_reviews
-- (No data in this table)

-- ============================================================================
-- SERVICE PROVIDERS
-- ============================================================================

-- service_providers
-- (No data in this table)

-- service_provider_notes
-- (No data in this table)

-- service_provider_reviews
-- (No data in this table)

-- ============================================================================
-- NOTES
-- ============================================================================

-- notes
-- (No data in this table)

-- ============================================================================
-- KNOWLEDGE BASE
-- ============================================================================

-- knowledge_base_categories
-- (No data in this table)

-- knowledge_base_playbooks
-- (No data in this table)

-- knowledge_base_cards
-- (No data in this table)

-- kb_card_views
-- (No data in this table)

-- ============================================================================
-- COACHING
-- ============================================================================

-- coaching_conversations
-- (No data in this table)

-- coaching_conversation_messages
-- (No data in this table)

-- ============================================================================
-- SOCIAL
-- ============================================================================

-- friend_connections
-- (No data in this table)

-- birthday_celebrations
-- (No data in this table)

-- social_posts
-- (No data in this table)

-- social_post_comments
-- (No data in this table)

-- social_post_reactions
-- (No data in this table)

-- ============================================================================
-- FEEDBACK
-- ============================================================================

-- bug_reports
INSERT INTO public.bug_reports (id, user_id, team_id, summary, description, module, severity, status, vote_count, attachments, environment, steps_to_reproduce, expected_behaviour, admin_comments, fixed_at, fixed_by, created_at, updated_at, position, ai_analysis, ai_analyzed_at, ai_confidence, ai_impact, workspace_module, archived_at, archived_reason, external_ticket_id, external_ticket_url, external_system, satisfaction_rating, satisfaction_feedback, satisfaction_requested_at, satisfaction_recorded_at) VALUES
('6c56bb71-06ba-4d1e-a47c-7ad56c4e3b07', 'd74e33d7-f60f-4e30-9496-c12997b6c062', NULL, 'Bug Report Dialog Disappears on Click', 'When I click "Report a Bug" from the dropdown menu, the dialog briefly appears then immediately disappears. This makes it impossible to submit bug reports.', NULL, NULL, 'fixed', 0, '{}', NULL, NULL, NULL, NULL, '2025-01-29 03:15:16.806836+00', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '2025-01-28 07:29:49.525074+00', '2025-01-29 03:15:16.806836+00', 0.5, '{"analysis": "The issue stems from the UserMenuDropdown component''s aggressive `onOpenChange` behavior. When the dialog is opened via `setIsReportBugOpen(true)`, the `onOpenChange(false)` callback from the DropdownMenu immediately fires, closing the dialog before the user can interact with it. This is a classic event propagation conflict between nested interactive components.", "root_cause": "Event handler conflict between DropdownMenu and Dialog state management", "confidence": 85, "impact_level": "high", "suggested_fix": "Implement one of two solutions:\n1. **Recommended**: Use `e.stopPropagation()` on the dialog trigger to prevent the dropdown from closing\n2. **Alternative**: Move the BugReportDialog outside the DropdownMenu component tree and use a global state manager\n\nThe recommended fix is simpler and maintains the current component structure.", "affected_files": ["src/components/UserMenuDropdown.tsx", "src/components/BugReportDialog.tsx"], "clarifying_questions": ["Does this happen on both desktop and mobile?", "Are there any console errors when this occurs?", "Does the same issue happen with the Feature Request dialog?"], "analysis_metadata": {"model": "google/gemini-2.5-flash", "analyzed_at": "2025-01-29T03:12:38.095Z", "token_usage": {"prompt": 450, "completion": 280}}}', '2025-01-29 03:12:38.113+00', 85, 'high', 'feedback-centre', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- bug_report_categories
-- (No data in this table)

-- bug_report_comments
INSERT INTO public.bug_report_comments (id, bug_report_id, user_id, content, created_at, updated_at) VALUES
('14e4e84f-0ba4-41ab-a06a-8c88aacfa9c3', '6c56bb71-06ba-4d1e-a47c-7ad56c4e3b07', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'Fixed by stopping event propagation on the dialog trigger. The dialog now stays open and is fully functional.', '2025-01-29 03:15:16.829+00', '2025-01-29 03:15:16.829+00')
ON CONFLICT (id) DO NOTHING;

-- bug_report_votes
-- (No data in this table)

-- user_bug_points
INSERT INTO public.user_bug_points (id, user_id, bug_report_id, points_awarded, points_reason, awarded_at, awarded_by) VALUES
('bfe6056b-9b18-4e40-b40b-dae01c2c95e8', 'd74e33d7-f60f-4e30-9496-c12997b6c062', '6c56bb71-06ba-4d1e-a47c-7ad56c4e3b07', 50, 'bug_fixed', '2025-01-29 03:15:16.806836+00', NULL)
ON CONFLICT (id) DO NOTHING;

-- feature_requests
-- (No data in this table)

-- feature_request_comments
-- (No data in this table)

-- feature_request_votes
-- (No data in this table)

-- ============================================================================
-- HELP REQUESTS
-- ============================================================================

-- help_requests
-- (No data in this table)

-- ============================================================================
-- INVITATIONS
-- ============================================================================

-- pending_invitations
-- (No data in this table)

-- invitation_activity_log
-- (No data in this table)

-- invitation_rate_limits
-- (No data in this table)

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- notifications
INSERT INTO public.notifications (id, user_id, type, title, message, metadata, read, expires_at, created_at, display_as_banner) VALUES
('4baf4a32-b65d-40f6-ac42-87a0f2b59e43', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'bug_report_fixed', 'Bug Fixed! 🎉', 'Your bug report "Bug Report Dialog Disappears on Click" has been fixed. You''ve earned 50 Bug Hunter points!', '{"bug_id": "6c56bb71-06ba-4d1e-a47c-7ad56c4e3b07", "points_awarded": 50}', true, '2025-02-05 03:15:16.806836+00', '2025-01-29 03:15:16.820838+00', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADMIN LOGS
-- ============================================================================

-- admin_activity_log
INSERT INTO public.admin_activity_log (id, admin_id, activity_type, description, metadata, created_at) VALUES
('1033ace4-e1f3-4e15-8bd5-5d2a4c1dce19', 'd74e33d7-f60f-4e30-9496-c12997b6c062', 'team_created', 'Created team: Mark & Co.', '{"team_id": "fdc66f03-d7b4-4ed7-b5f1-ce2930da6b23"}', '2025-01-20 05:26:09.546308+00')
ON CONFLICT (id) DO NOTHING;

-- admin_impersonation_log
-- (No data in this table)

-- audit_logs
-- (No data in this table)

-- ============================================================================
-- MISCELLANEOUS
-- ============================================================================

-- ai_usage_tracking
-- (No data in this table)

-- stat_snapshots
-- (No data in this table)

-- system_health_metrics
-- (No data in this table)

-- ============================================================================
-- RESTORE SETTINGS
-- ============================================================================

-- Re-enable triggers
SET session_replication_role = DEFAULT;

COMMIT;

-- ============================================================================
-- POST-IMPORT INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Update sequences (if needed):
--    SELECT setval('your_sequence_name', (SELECT MAX(id) FROM your_table));
-- 
-- 2. Verify data integrity:
--    SELECT COUNT(*) FROM profiles;
--    SELECT COUNT(*) FROM teams;
--    SELECT COUNT(*) FROM bug_reports;
-- 
-- 3. Test RLS policies are working correctly
-- 
-- 4. Storage files need to be migrated separately using Supabase CLI or API
-- 
-- 5. auth.users table must be populated via:
--    - User signups
--    - Supabase Auth Admin API
--    - Import from auth backup
-- 
-- ============================================================================
