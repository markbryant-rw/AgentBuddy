-- Add is_shared column to task_lists
ALTER TABLE public.task_lists 
ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Team members can view their team's lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can insert lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can update lists" ON public.task_lists;
DROP POLICY IF EXISTS "Team members can delete lists" ON public.task_lists;

-- Create new RLS policies for viewing
CREATE POLICY "Users can view their own lists"
ON public.task_lists
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can view shared team lists"
ON public.task_lists
FOR SELECT
USING (
  is_shared = true 
  AND team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create policy for inserting
CREATE POLICY "Users can create their own lists"
ON public.task_lists
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Create policy for updating (only own lists)
CREATE POLICY "Users can update their own lists"
ON public.task_lists
FOR UPDATE
USING (created_by = auth.uid());

-- Create policy for deleting (only own lists)
CREATE POLICY "Users can delete their own lists"
ON public.task_lists
FOR DELETE
USING (created_by = auth.uid());

-- Add trigger to check task assignments on personal lists
CREATE OR REPLACE FUNCTION check_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigning to someone else
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    -- Check if the list is shared
    IF NOT EXISTS (
      SELECT 1 
      FROM task_lists 
      WHERE id = NEW.list_id 
      AND is_shared = true
    ) THEN
      RAISE EXCEPTION 'Cannot assign tasks to others on personal lists';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_assignment_check
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION check_task_assignment();