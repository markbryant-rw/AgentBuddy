-- Phase 1: Drop policies that depend on conversation_id
DROP POLICY IF EXISTS "Users can view conversation tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;

-- Phase 2: Create new simplified RLS policy for task creation
CREATE POLICY "Team members can create tasks"
ON tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid() 
  AND team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Phase 3: Remove defunct conversation-based task fields
ALTER TABLE tasks 
DROP COLUMN IF EXISTS conversation_id,
DROP COLUMN IF EXISTS message_id;