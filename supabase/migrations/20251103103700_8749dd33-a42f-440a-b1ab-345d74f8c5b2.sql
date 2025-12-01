-- Drop the calculate_subtask_progress_v2 function
DROP FUNCTION IF EXISTS public.calculate_subtask_progress_v2(uuid);

-- Drop all tables with CASCADE to remove all dependencies
-- Only dropping tables that exist
DROP TABLE IF EXISTS public.task_tag_assignments_v2 CASCADE;
DROP TABLE IF EXISTS public.task_tags_v2 CASCADE;
DROP TABLE IF EXISTS public.task_assignees_v2 CASCADE;
DROP TABLE IF EXISTS public.task_attachments_v2 CASCADE;
DROP TABLE IF EXISTS public.task_comments_v2 CASCADE;
DROP TABLE IF EXISTS public.tasks_v2 CASCADE;
DROP TABLE IF EXISTS public.task_lists_v2 CASCADE;
DROP TABLE IF EXISTS public.task_boards_v2 CASCADE;

-- Remove the storage bucket if it exists
DELETE FROM storage.buckets WHERE id = 'task-attachments-v2';