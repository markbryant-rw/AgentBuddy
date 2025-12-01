-- Add size_category and order_within_category to daily_planner_items
ALTER TABLE daily_planner_items 
ADD COLUMN size_category TEXT DEFAULT 'medium' CHECK (size_category IN ('big', 'medium', 'little')),
ADD COLUMN order_within_category INTEGER DEFAULT 0;

-- Update existing items to have order_within_category based on position
UPDATE daily_planner_items 
SET order_within_category = position;

-- Create index for efficient category queries
CREATE INDEX idx_daily_planner_items_category ON daily_planner_items(team_id, scheduled_date, size_category, order_within_category);