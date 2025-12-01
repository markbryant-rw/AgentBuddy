-- Add foreign key constraint from daily_planner_assignments.user_id to profiles.id
ALTER TABLE daily_planner_assignments
ADD CONSTRAINT daily_planner_assignments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_planner_assignments_user_id 
ON daily_planner_assignments(user_id);