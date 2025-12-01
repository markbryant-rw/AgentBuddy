-- Phase 2: Add Performance Indexes (Fixed)

-- Critical indexes for most common queries
CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date 
ON kpi_entries(user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_tasks_list_status 
ON tasks(list_id, completed, due_date) 
WHERE list_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_team_created 
ON tasks(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_daily_log_tracker_user_date 
ON daily_log_tracker(user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_period 
ON goals(user_id, period, start_date DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_team 
ON team_members(team_id, user_id);

-- Create materialized view for KPI aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS kpi_aggregates AS
SELECT 
  ke.user_id,
  ke.kpi_type,
  ke.entry_date,
  SUM(ke.value) as total_value,
  -- Today
  SUM(CASE WHEN ke.entry_date = CURRENT_DATE THEN ke.value ELSE 0 END) as today_value,
  -- Yesterday
  SUM(CASE WHEN ke.entry_date = CURRENT_DATE - 1 THEN ke.value ELSE 0 END) as yesterday_value,
  -- This week
  SUM(CASE 
    WHEN ke.entry_date >= date_trunc('week', CURRENT_DATE)::date 
    AND ke.entry_date <= CURRENT_DATE 
    THEN ke.value ELSE 0 
  END) as week_value,
  -- Last week
  SUM(CASE 
    WHEN ke.entry_date >= (date_trunc('week', CURRENT_DATE) - interval '7 days')::date 
    AND ke.entry_date < date_trunc('week', CURRENT_DATE)::date 
    THEN ke.value ELSE 0 
  END) as last_week_value
FROM kpi_entries ke
WHERE ke.entry_date >= CURRENT_DATE - 30
GROUP BY ke.user_id, ke.kpi_type, ke.entry_date;

-- Add indexes to materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_aggregates_unique 
ON kpi_aggregates(user_id, kpi_type, entry_date);

CREATE INDEX IF NOT EXISTS idx_kpi_aggregates_user 
ON kpi_aggregates(user_id, entry_date DESC);

-- Function to refresh KPI aggregates
CREATE OR REPLACE FUNCTION refresh_kpi_aggregates()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY kpi_aggregates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh on KPI insert/update
CREATE OR REPLACE FUNCTION trigger_refresh_kpi_aggregates()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_kpi_aggregates();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_kpi_on_insert ON kpi_entries;
CREATE TRIGGER refresh_kpi_on_insert
AFTER INSERT OR UPDATE OR DELETE ON kpi_entries
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_kpi_aggregates();