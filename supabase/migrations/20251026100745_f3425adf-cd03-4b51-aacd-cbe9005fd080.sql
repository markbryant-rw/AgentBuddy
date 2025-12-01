-- Create enums for task status and priority
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Modify tasks table: make conversation_id nullable and add new columns
ALTER TABLE tasks ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status task_status DEFAULT 'todo';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority task_priority DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings_pipeline(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_position INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_listing_id ON tasks(listing_id) WHERE listing_id IS NOT NULL;

-- Create task_assignees table (many-to-many)
CREATE TABLE task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);

-- Create task_comments table
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- Create task_attachments table
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- Create task_activity table
CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_created ON task_activity(created_at DESC);

-- Update RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON tasks;

CREATE POLICY "Team members can view team tasks"
  ON tasks FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can create team tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update team tasks"
  ON tasks FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete team tasks"
  ON tasks FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS for task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task assignees"
  ON task_assignees FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can manage task assignees"
  ON task_assignees FOR ALL
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

-- RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task comments"
  ON task_comments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can add task comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own task comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own task comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS for task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task attachments"
  ON task_attachments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Team members can upload task attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own task attachments"
  ON task_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- RLS for task_activity
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view task activity"
  ON task_activity FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "System can create activity logs"
  ON task_activity FOR INSERT
  WITH CHECK (true);

-- Create trigger function for auto-logging activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  -- Log completion
  IF (TG_OP = 'UPDATE' AND OLD.completed = false AND NEW.completed = true) THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.last_updated_by,
      'completed',
      jsonb_build_object('completed_at', NEW.completed_at)
    );
  END IF;

  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO task_activity (task_id, user_id, activity_type, metadata)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Backfill team_id for existing tasks
UPDATE tasks
SET team_id = (
  SELECT team_id FROM team_members 
  WHERE user_id = tasks.created_by 
  LIMIT 1
)
WHERE team_id IS NULL;

-- Make team_id NOT NULL after backfill
ALTER TABLE tasks ALTER COLUMN team_id SET NOT NULL;

-- Backfill status based on completed flag
UPDATE tasks
SET status = CASE 
  WHEN completed = true THEN 'done'::task_status
  ELSE 'todo'::task_status
END;

-- Migrate single assignee to task_assignees table
INSERT INTO task_assignees (task_id, user_id, assigned_by)
SELECT id, assigned_to, created_by
FROM tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;