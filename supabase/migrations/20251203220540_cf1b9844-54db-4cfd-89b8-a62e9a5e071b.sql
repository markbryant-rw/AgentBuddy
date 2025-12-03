-- Add color column to task_lists
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Add description column if needed
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS description TEXT;

-- Create RLS policies for task_lists
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Team members can view task lists" ON task_lists;
DROP POLICY IF EXISTS "Team members can create task lists" ON task_lists;
DROP POLICY IF EXISTS "Team members can update task lists" ON task_lists;
DROP POLICY IF EXISTS "Team members can delete task lists" ON task_lists;

-- Create new policies
CREATE POLICY "Team members can view task lists"
ON task_lists FOR SELECT
USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Team members can create task lists"
ON task_lists FOR INSERT
WITH CHECK (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Team members can update task lists"
ON task_lists FOR UPDATE
USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Team members can delete task lists"
ON task_lists FOR DELETE
USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR project_id IN (SELECT id FROM projects WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
);