-- Add team member KPI contribution flag
ALTER TABLE team_members 
ADD COLUMN contributes_to_kpis BOOLEAN NOT NULL DEFAULT true;

-- Add user pipeline view preference
ALTER TABLE user_preferences 
ADD COLUMN pipeline_view_preference TEXT NOT NULL DEFAULT 'both' 
CHECK (pipeline_view_preference IN ('individual', 'team', 'both'));

-- Add admin override tracking to goals
ALTER TABLE goals
ADD COLUMN set_by_admin BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN admin_notes TEXT;