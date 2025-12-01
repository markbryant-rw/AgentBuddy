-- ============================================================
-- Bug Hunt Enhancement Suite - Complete Database Migration
-- Implements: AI Analysis, Satisfaction Polls, Categories, Triage
-- ============================================================

-- ============================================================
-- SPRINT 1 & 2: Bug Satisfaction & Module Tracking
-- ============================================================

-- Add workspace/module field and satisfaction tracking to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS workspace_module TEXT;

ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_feedback TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_recorded_at TIMESTAMPTZ;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS satisfaction_requested_at TIMESTAMPTZ;

-- ============================================================
-- SPRINT 3: AI Analysis for Bug Reports
-- ============================================================

-- Add AI analysis columns to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(3,2) CHECK (ai_confidence BETWEEN 0 AND 1);
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_impact TEXT CHECK (ai_impact IN ('low', 'medium', 'high', 'critical'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_analyzed ON bug_reports(ai_analyzed_at) WHERE ai_analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_impact ON bug_reports(ai_impact) WHERE ai_impact IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bug_reports_workspace_module ON bug_reports(workspace_module) WHERE workspace_module IS NOT NULL;

-- ============================================================
-- SPRINT 4: AI Analysis for Feature Requests
-- ============================================================

-- Add AI analysis columns to feature_requests
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_estimated_effort TEXT CHECK (ai_estimated_effort IN ('small', 'medium', 'large', 'epic'));
ALTER TABLE feature_requests ADD COLUMN IF NOT EXISTS ai_priority_score NUMERIC(3,2) CHECK (ai_priority_score BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS idx_feature_requests_ai_analyzed ON feature_requests(ai_analyzed_at) WHERE ai_analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_ai_priority ON feature_requests(ai_priority_score DESC) WHERE ai_priority_score IS NOT NULL;

-- ============================================================
-- SPRINT 6: Bug Categories & Triage System
-- ============================================================

-- Create bug_categories table
CREATE TABLE IF NOT EXISTS bug_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO bug_categories (name, color, icon, description) VALUES
  ('UI', '#3b82f6', 'layout', 'Visual bugs, styling issues, responsive design problems'),
  ('Data', '#10b981', 'database', 'Data integrity issues, loading problems, saving errors'),
  ('Permissions', '#f59e0b', 'shield', 'Access control, RLS policies, authentication issues'),
  ('Performance', '#ef4444', 'zap', 'Slow loading, timeouts, optimization needs')
ON CONFLICT (name) DO NOTHING;

-- Create many-to-many relationship for bug categories
CREATE TABLE IF NOT EXISTS bug_report_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_id UUID REFERENCES bug_reports(id) ON DELETE CASCADE,
  category_id UUID REFERENCES bug_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bug_report_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_bug_report_categories_bug_id ON bug_report_categories(bug_report_id);
CREATE INDEX IF NOT EXISTS idx_bug_report_categories_category_id ON bug_report_categories(category_id);

-- Add external ticket tracking to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_ticket_url TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_ticket_id TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS external_system TEXT CHECK (external_system IN ('github', 'jira', 'linear', 'other'));

-- ============================================================
-- Enable RLS for new tables
-- ============================================================

ALTER TABLE bug_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_report_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view bug categories"
  ON bug_categories FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can view bug-category relationships
CREATE POLICY "Anyone can view bug report categories"
  ON bug_report_categories FOR SELECT
  TO authenticated
  USING (true);

-- Platform admins can manage categories
CREATE POLICY "Platform admins can manage bug categories"
  ON bug_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Platform admins can manage bug-category relationships
CREATE POLICY "Platform admins can manage bug report categories"
  ON bug_report_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));