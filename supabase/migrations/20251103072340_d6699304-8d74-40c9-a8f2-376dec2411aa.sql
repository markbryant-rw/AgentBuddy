-- Tasks2 Module: Fresh Database Schema
-- All tables use _v2 suffix to avoid conflicts

-- 1. Task Boards Table
CREATE TABLE task_boards_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Task Lists Table
CREATE TABLE task_lists_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES task_boards_v2(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tasks Table (includes subtasks via parent_task_id)
CREATE TABLE tasks_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES task_lists_v2(id) ON DELETE CASCADE,
  board_id UUID REFERENCES task_boards_v2(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  order_position INTEGER NOT NULL DEFAULT 0,
  parent_task_id UUID REFERENCES tasks_v2(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Task Assignees (many-to-many)
CREATE TABLE task_assignees_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- 5. Task Tags
CREATE TABLE task_tags_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, name)
);

-- 6. Task Tag Assignments
CREATE TABLE task_tag_assignments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES task_tags_v2(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

-- 7. Task Comments
CREATE TABLE task_comments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Task Attachments
CREATE TABLE task_attachments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Task Activity Log
CREATE TABLE task_activity_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_v2(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tasks_v2_list_id ON tasks_v2(list_id);
CREATE INDEX idx_tasks_v2_board_id ON tasks_v2(board_id);
CREATE INDEX idx_tasks_v2_parent_task_id ON tasks_v2(parent_task_id);
CREATE INDEX idx_tasks_v2_due_date ON tasks_v2(due_date);
CREATE INDEX idx_tasks_v2_completed ON tasks_v2(completed);
CREATE INDEX idx_task_lists_v2_board_id ON task_lists_v2(board_id);
CREATE INDEX idx_task_assignees_v2_task_id ON task_assignees_v2(task_id);
CREATE INDEX idx_task_assignees_v2_user_id ON task_assignees_v2(user_id);
CREATE INDEX idx_task_tag_assignments_v2_task_id ON task_tag_assignments_v2(task_id);
CREATE INDEX idx_task_comments_v2_task_id ON task_comments_v2(task_id);
CREATE INDEX idx_task_attachments_v2_task_id ON task_attachments_v2(task_id);

-- Function: Calculate Subtask Progress (FRESH implementation)
CREATE OR REPLACE FUNCTION calculate_subtask_progress_v2(p_parent_task_id UUID)
RETURNS TABLE(completed BIGINT, total BIGINT, percentage NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE t.completed = true) AS completed,
    COUNT(*) AS total,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE t.completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 0)
    END AS percentage
  FROM tasks_v2 t
  WHERE t.parent_task_id = p_parent_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Task Boards
ALTER TABLE task_boards_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team boards"
  ON task_boards_v2 FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create boards for their teams"
  ON task_boards_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update team boards"
  ON task_boards_v2 FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete team boards"
  ON task_boards_v2 FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policies: Task Lists
ALTER TABLE task_lists_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team lists or own private lists"
  ON task_lists_v2 FOR SELECT
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

CREATE POLICY "Users can create lists for their teams"
  ON task_lists_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update accessible lists"
  ON task_lists_v2 FOR UPDATE
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

CREATE POLICY "Users can delete accessible lists"
  ON task_lists_v2 FOR DELETE
  USING (
    (is_shared = true AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
    OR (is_shared = false AND created_by = auth.uid())
  );

-- RLS Policies: Tasks
ALTER TABLE tasks_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible tasks"
  ON tasks_v2 FOR SELECT
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create tasks in accessible lists"
  ON tasks_v2 FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update accessible tasks"
  ON tasks_v2 FOR UPDATE
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Users can delete accessible tasks"
  ON tasks_v2 FOR DELETE
  USING (
    list_id IN (
      SELECT tl.id FROM task_lists_v2 tl
      WHERE (tl.is_shared = true AND tl.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
      OR (tl.is_shared = false AND tl.created_by = auth.uid())
    )
  );

-- RLS Policies: Task Assignees
ALTER TABLE task_assignees_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task assignees"
  ON task_assignees_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can manage assignees"
  ON task_assignees_v2 FOR ALL
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- RLS Policies: Task Tags
ALTER TABLE task_tags_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team tags"
  ON task_tags_v2 FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create team tags"
  ON task_tags_v2 FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete team tags"
  ON task_tags_v2 FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policies: Task Tag Assignments
ALTER TABLE task_tag_assignments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tag assignments"
  ON task_tag_assignments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can manage tag assignments"
  ON task_tag_assignments_v2 FOR ALL
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- RLS Policies: Task Comments
ALTER TABLE task_comments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tasks"
  ON task_comments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can create comments"
  ON task_comments_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own comments"
  ON task_comments_v2 FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON task_comments_v2 FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies: Task Attachments
ALTER TABLE task_attachments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments on accessible tasks"
  ON task_attachments_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can upload attachments"
  ON task_attachments_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete own attachments"
  ON task_attachments_v2 FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS Policies: Task Activity
ALTER TABLE task_activity_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity on accessible tasks"
  ON task_activity_v2 FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks_v2)
  );

CREATE POLICY "Users can create activity logs"
  ON task_activity_v2 FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks_v2)
  );

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments-v2', 'task-attachments-v2', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments-v2'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view task attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments-v2'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own task attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments-v2'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );