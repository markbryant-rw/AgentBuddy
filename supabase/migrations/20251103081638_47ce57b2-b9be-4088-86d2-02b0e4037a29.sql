-- Add is_shared column to task_boards_v2
ALTER TABLE task_boards_v2 
ADD COLUMN is_shared BOOLEAN DEFAULT true NOT NULL;