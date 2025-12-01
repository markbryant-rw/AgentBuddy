-- Add owner_role and is_personal_admin_board columns to task_boards
ALTER TABLE task_boards 
ADD COLUMN IF NOT EXISTS owner_role TEXT,
ADD COLUMN IF NOT EXISTS is_personal_admin_board BOOLEAN DEFAULT false;

-- Create index for admin task lookups
CREATE INDEX IF NOT EXISTS idx_task_boards_admin 
ON task_boards(created_by, is_personal_admin_board) 
WHERE is_personal_admin_board = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "platform_admins_personal_boards" ON task_boards;
DROP POLICY IF EXISTS "office_managers_personal_boards" ON task_boards;

-- Create policy to allow platform admins to create personal boards
CREATE POLICY "platform_admins_personal_boards" ON task_boards
FOR ALL 
TO authenticated
USING (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'platform_admin'::app_role)
  AND created_by = auth.uid()
);

-- Create policy to allow office managers to create personal boards
CREATE POLICY "office_managers_personal_boards" ON task_boards
FOR ALL
TO authenticated
USING (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'office_manager'::app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  is_personal_admin_board = true 
  AND has_role(auth.uid(), 'office_manager'::app_role)
  AND created_by = auth.uid()
);