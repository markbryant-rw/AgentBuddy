-- Add notes column to daily_planner_items
ALTER TABLE daily_planner_items
ADD COLUMN IF NOT EXISTS notes TEXT;