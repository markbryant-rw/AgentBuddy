-- Phase 1: Create task_boards table
CREATE TABLE IF NOT EXISTS task_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📋',
  color TEXT DEFAULT '#3b82f6',
  is_shared BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  order_position INTEGER DEFAULT 0
);

-- Phase 2: Add board_id to task_lists (nullable first for migration)
ALTER TABLE task_lists ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES task_boards(id) ON DELETE CASCADE;

-- Phase 3: Create default "Main Board" for existing teams
INSERT INTO task_boards (team_id, title, description, is_shared, created_by, order_position)
SELECT DISTINCT 
  tl.team_id,
  'Main Board',
  'Your primary task board',
  true,
  tl.created_by,
  0
FROM task_lists tl
WHERE NOT EXISTS (
  SELECT 1 FROM task_boards tb WHERE tb.team_id = tl.team_id AND tb.title = 'Main Board'
);

-- Phase 4: Link existing lists to their team's Main Board
UPDATE task_lists tl
SET board_id = (
  SELECT tb.id 
  FROM task_boards tb 
  WHERE tb.team_id = tl.team_id 
    AND tb.title = 'Main Board'
  LIMIT 1
)
WHERE board_id IS NULL;

-- Phase 5: Create "Backlog" list on Main Board for each team (if not exists)
INSERT INTO task_lists (team_id, board_id, title, description, color, icon, order_position, created_by, is_shared)
SELECT DISTINCT
  tb.team_id,
  tb.id,
  'Backlog',
  'Tasks waiting to be organized',
  '#64748b',
  'inbox',
  999,
  tb.created_by,
  tb.is_shared
FROM task_boards tb
WHERE tb.title = 'Main Board'
  AND NOT EXISTS (
    SELECT 1 FROM task_lists 
    WHERE board_id = tb.id AND title = 'Backlog'
  );

-- Phase 6: Migrate orphaned tasks (without list_id) to Backlog
-- EXCLUDE transaction tasks (transaction_id IS NOT NULL)
UPDATE tasks t
SET list_id = (
  SELECT tl.id 
  FROM task_lists tl
  JOIN task_boards tb ON tl.board_id = tb.id
  WHERE tb.team_id = t.team_id 
    AND tl.title = 'Backlog'
    AND tb.title = 'Main Board'
  LIMIT 1
)
WHERE list_id IS NULL 
  AND transaction_id IS NULL;

-- Phase 7: Make board_id required after migration
ALTER TABLE task_lists ALTER COLUMN board_id SET NOT NULL;

-- Phase 8: Enable RLS on task_boards
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;

-- Phase 9: RLS Policies for task_boards
CREATE POLICY "Team members can view their team's boards" ON task_boards
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create boards" ON task_boards
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Board owners and admins can update boards" ON task_boards
FOR UPDATE USING (
  created_by = auth.uid() OR
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  )
);

CREATE POLICY "Board owners and admins can delete boards" ON task_boards
FOR DELETE USING (
  created_by = auth.uid() OR
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.access_level = 'admin'
  )
);

-- Phase 10: Add index for performance
CREATE INDEX IF NOT EXISTS idx_task_lists_board_id ON task_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_task_boards_team_id ON task_boards(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_transaction_id ON tasks(transaction_id) WHERE transaction_id IS NOT NULL;