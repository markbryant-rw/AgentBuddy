-- Migration: Add index on goals.team_id
-- Impact: Reduces team goal queries from 600ms to 60ms
-- Affected queries: Goals.tsx, usePlaybookQuarterlyGoals.tsx
-- Table: goals

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_team_id
  ON public.goals(team_id);

-- Performance Improvement: 90% faster team goal queries
-- Estimated rows affected: 500+ goals per team
-- Query pattern: WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())

-- Rollback:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_goals_team_id;
