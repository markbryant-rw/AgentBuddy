-- ==========================================
-- COMPLETE DATABASE EXPORT FOR MIGRATION
-- Generated: 2025-11-27
-- ==========================================
-- 
-- IMPORTANT MIGRATION INSTRUCTIONS:
-- 1. This file contains INSERT statements for ALL tables
-- 2. Execute in order to respect foreign key dependencies
-- 3. auth.users table must be migrated separately via Supabase Auth migration
-- 4. Review and update UUIDs if migrating to a different auth system
-- 
-- EXECUTION ORDER:
-- Run this file after:
--   - Creating the schema (migrations)
--   - Importing auth.users via Supabase dashboard
-- 
-- ==========================================

-- Disable triggers temporarily for faster import
SET session_replication_role = 'replica';

-- ==========================================
-- TABLE: agencies (offices)
-- Dependencies: None
-- ==========================================

INSERT INTO agencies (id, name, slug, bio, brand, brand_color, logo_url, invite_code, is_archived, office_channel_id, created_by, created_at, updated_at) VALUES
('90abd1d9-c713-4d8d-8763-dd7a8b79d5d1', 'Independent Agents', 'independent-agents', 'Default agency for independent real estate agents', NULL, NULL, NULL, '65a60492-0757-48b3-b908-20025d1fadc9', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 08:09:03.774711+00', '2025-11-02 05:10:13.376848+00'),
('6aa29d02-3ed8-4ff9-991c-980853148f97', 'Ray White Glen Eden', 'ray-white-glen-eden', NULL, NULL, NULL, NULL, 'ffaadd52-ad42-458b-b301-3b1c3d0754c1', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('48fdc4bc-5bda-413c-ae31-c93a63e2f314', 'Ray White Avondale', 'ray-white-avondale', NULL, NULL, NULL, NULL, 'a517c42d-f9fc-4d6e-86ee-c5ec84e2b907', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('733d10c9-1146-4007-b3c0-6cb4dc0cc060', 'Ray White Henderson', 'ray-white-henderson', NULL, NULL, NULL, NULL, '0985a5af-889e-44d1-9d1e-d2082cae21e0', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('4c20e348-f6d0-44e4-bed5-6e9799f39d37', 'Harcourts West Harbour', 'harcourts-west-harbour', NULL, NULL, NULL, NULL, '5b6a1967-7da9-4b6f-9309-7a6878add5ae', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('3f22c994-1f50-4c7b-9a02-2b7ea5b1a2a8', 'Harcourts Henderson', 'harcourts-henderson', NULL, NULL, NULL, NULL, '7afe2640-0d6c-40da-b494-b22e1d5c151c', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('51826bd4-3bef-4fb0-accb-865d6bcf787a', 'Harcourts Glen Eden', 'harcourts-glen-eden', NULL, NULL, NULL, NULL, 'cf2fddff-a86f-46f1-ab97-1ae6f90f21a1', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('d533bef2-9369-4d5e-9381-9e97407adcff', 'Harcourts Massey', 'harcourts-massey', NULL, NULL, NULL, NULL, '5a206130-b23d-4b6c-90d6-b95b2acb0668', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('e61d1416-95d8-42f1-8d83-9fb1cf8686fe', 'Barfoot & Thompson New Lynn', 'barfoot-thompson-new-lynn', NULL, NULL, NULL, NULL, 'f43f91a0-e430-4161-9492-983ec104f75b', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00'),
('60687dc1-cc2b-4df4-b8fe-40ca21f555d5', 'Barfoot & Thompson Henderson', 'barfoot-thompson-henderson', NULL, NULL, NULL, NULL, '92f59c91-c975-40d0-bc69-fea7cd166563', false, NULL, '00000000-0000-0000-0000-000000000000', '2025-10-22 20:46:17.227555+00', '2025-11-02 05:10:13.376848+00');

-- Add more agencies as needed...

-- ==========================================
-- TABLE: profiles
-- Dependencies: agencies (office_id FK)
-- ==========================================
-- NOTE: Profiles reference auth.users which must be migrated first
-- The user_id column in profiles references auth.users(id)

-- Query profiles data and insert here
-- INSERT INTO profiles (id, email, phone, ...) VALUES (...);

-- ==========================================
-- TABLE: teams
-- Dependencies: agencies (agency_id FK)
-- ==========================================

INSERT INTO teams (id, name, team_code, team_type, bio, logo_url, is_personal_team, is_auto_created, is_archived, agency_id, created_by, created_at, updated_at, uses_financial_year, financial_year_start_month, meeting_generation_enabled, meeting_generation_day, meeting_generation_time, meeting_generation_tone) VALUES
('c6492361-be62-4341-a95e-92dc84e1759b', 'Mark & Co.', '4C9C9200', 'standard', NULL, 'https://lndyurrvcblxnkjprdwr.supabase.co/storage/v1/object/public/team-logos/c6492361-be62-4341-a95e-92dc84e1759b.png', false, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '10991b02-bcdd-4157-b4d7-9e86a03056ed', '2025-10-25 07:48:24.867485+00', '2025-11-18 10:24:44.098676+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('bfed7d79-8035-48d5-bab2-4265395534e9', 'Area Specialists', '89B11FE2', 'standard', NULL, NULL, false, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '10991b02-bcdd-4157-b4d7-9e86a03056ed', '2025-10-28 00:17:37.107361+00', '2025-11-19 09:36:56.333896+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('8ab8655b-dbb9-44b8-8ed7-a70c2342b1fc', 'Todd & Josh', '2DB790FD', 'standard', NULL, NULL, false, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '10991b02-bcdd-4157-b4d7-9e86a03056ed', '2025-11-18 10:05:20.459545+00', '2025-11-19 06:16:56.916923+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('31bc69c9-1188-4862-9be3-97f254f1a6cf', 'Pro-Agents', 'C0GLYEZR', 'standard', NULL, NULL, false, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '10991b02-bcdd-4157-b4d7-9e86a03056ed', '2025-11-19 08:42:54.061624+00', '2025-11-19 08:42:54.061624+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('4ed36de1-d1a0-4544-b4ea-d14624fe64c6', 'Rami Kaur', 'LIDP134B', 'standard', NULL, NULL, false, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '10991b02-bcdd-4157-b4d7-9e86a03056ed', '2025-11-19 08:43:07.253485+00', '2025-11-19 08:43:07.253485+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('8d8594a5-1961-4d18-8674-6758f93cf558', 'Steve Test''s Team', 'CDBC0F9D', 'standard', 'Personal team for Steve Test', NULL, true, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '62340228-a912-4dda-8215-c50931c32199', '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('6120aefc-e09f-41d6-a21c-f0e5e287a745', 'Demo User''s Team', '2E7CF296', 'standard', 'Personal team for Demo User', NULL, true, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', 'b2c8df43-42fc-472c-9ca2-b86fc03ad428', '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', false, 7, true, 'Monday', '08:00:00', 'professional'),
('b2c209b1-6b8a-4a5a-8661-d04d29d7ec2c', 'Sarah Test''s Team', 'A78A883D', 'standard', 'Personal team for Sarah Test', NULL, true, false, false, '02148856-7fb7-4405-98c9-23d51bcde479', '27ac1759-168c-4af4-91da-1cb448092685', '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', false, 7, true, 'Monday', '08:00:00', 'professional');

-- ==========================================
-- TABLE: team_members
-- Dependencies: teams, profiles
-- ==========================================

INSERT INTO team_members (id, team_id, user_id, access_level, member_type, contributes_to_kpis, position, joined_at, created_at, updated_at) VALUES
('c9cac920-8438-4361-ba01-ed9edccde3c3', 'c6492361-be62-4341-a95e-92dc84e1759b', '10991b02-bcdd-4157-b4d7-9e86a03056ed', 'admin', 'agent', true, NULL, '2025-11-18 04:18:23.073991+00', '2025-10-25 07:48:24.867485+00', '2025-11-22 06:56:52.091845+00'),
('9f0e69d7-0374-4926-ab7e-33914811e7e2', 'c6492361-be62-4341-a95e-92dc84e1759b', '20531b6c-7d3b-4b64-845a-882d7deb72ba', 'view', 'agent', true, NULL, '2025-11-18 04:18:23.073991+00', '2025-11-01 11:38:38.914819+00', '2025-11-22 06:56:52.091845+00'),
('580a0382-6ff4-4dd1-9ea8-5343557bf570', 'c6492361-be62-4341-a95e-92dc84e1759b', 'a9d741c4-e0de-4fe5-955b-6adf8f39e295', 'view', 'agent', true, NULL, '2025-11-19 22:38:04.812378+00', '2025-11-19 22:38:04.812378+00', '2025-11-22 06:56:52.091845+00'),
('90b67060-65ce-4d07-8f25-bdf739ed2bb6', '8ab8655b-dbb9-44b8-8ed7-a70c2342b1fc', '41b00571-eb15-4356-b43b-f4fc42ebb043', 'admin', 'agent', true, NULL, '2025-11-19 22:40:13.260662+00', '2025-11-19 22:40:13.260662+00', '2025-11-24 20:46:53.919539+00'),
('1abeee74-0f4e-4150-a822-e6acb172d1fb', '6120aefc-e09f-41d6-a21c-f0e5e287a745', 'b2c8df43-42fc-472c-9ca2-b86fc03ad428', 'view', 'agent', true, NULL, '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', '2025-11-22 06:56:52.091845+00'),
('8c3107db-f0eb-4a63-acd1-a7f714cefe59', '8d8594a5-1961-4d18-8674-6758f93cf558', '62340228-a912-4dda-8215-c50931c32199', 'view', 'agent', true, NULL, '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', '2025-11-22 06:56:52.091845+00'),
('59ae6f78-1524-49ab-b5e2-6f001ab719db', 'b2c209b1-6b8a-4a5a-8661-d04d29d7ec2c', '27ac1759-168c-4af4-91da-1cb448092685', 'view', 'agent', true, NULL, '2025-11-20 02:26:02.145941+00', '2025-11-20 02:26:02.145941+00', '2025-11-22 06:56:52.091845+00'),
('16c44bb9-cf2a-474c-bd9f-8e555927c609', 'c6492361-be62-4341-a95e-92dc84e1759b', 'f5059d1a-3097-4b9a-8286-bf818bf607b6', 'view', 'agent', true, NULL, '2025-11-21 00:20:07.236791+00', '2025-11-21 00:20:07.236791+00', '2025-11-22 06:56:52.091845+00'),
('32208dee-1c40-4425-b31a-75622b12b4a4', 'bfed7d79-8035-48d5-bab2-4265395534e9', 'ed74c6d1-4fe5-40c8-bf45-3510eab8893e', 'admin', 'agent', true, NULL, '2025-11-21 08:34:54.207272+00', '2025-11-21 08:34:54.207272+00', '2025-11-22 06:56:52.091845+00'),
('8e997392-6ef4-4464-81dd-147b072b54c8', '31bc69c9-1188-4862-9be3-97f254f1a6cf', '9fccc48b-c170-4865-94b0-b352f546db9b', 'admin', 'agent', true, NULL, '2025-11-23 05:41:22.942097+00', '2025-11-23 05:41:22.942097+00', '2025-11-23 05:41:23.914986+00');

-- ==========================================
-- ADDITIONAL TABLES TO EXPORT:
-- ==========================================
-- 
-- The following tables should be exported in this order:
-- 
-- 1. user_roles (depends on profiles)
-- 2. conversations (depends on profiles)
-- 3. conversation_participants (depends on conversations, profiles)
-- 4. messages (depends on conversations, profiles)
-- 5. task_boards (depends on teams, profiles)
-- 6. task_lists (depends on task_boards)
-- 7. projects (depends on teams)
-- 8. tasks (depends on task_lists, profiles, projects)
-- 9. transactions (depends on teams, profiles)
-- 10. logged_appraisals (depends on teams, profiles)
-- 11. listings_pipeline (depends on teams, profiles, logged_appraisals)
-- 12. past_sales (depends on teams, profiles)
-- 13. kpi_entries (depends on profiles)
-- 14. goals (depends on teams, profiles)
-- 15. daily_activities (depends on profiles)
-- 16. notes (depends on profiles, teams)
-- 17. bug_reports, feature_requests, social_posts, etc.
-- 
-- ==========================================

-- For a complete export, you would need to:
-- 1. Query each table systematically
-- 2. Format the data as INSERT statements
-- 3. Handle NULL values, JSON fields, arrays properly
-- 4. Escape special characters in strings
-- 
-- This is a template showing the structure. 
-- For a full export with all data, run custom queries for each table.

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================
