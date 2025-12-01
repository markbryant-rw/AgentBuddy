-- Create task_assignment_notifications table
CREATE TABLE public.task_assignment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_task_notifications_user 
  ON public.task_assignment_notifications(assigned_to, read, dismissed);

CREATE INDEX idx_task_notifications_task 
  ON public.task_assignment_notifications(task_id);

-- Enable RLS
ALTER TABLE public.task_assignment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.task_assignment_notifications
  FOR SELECT
  USING (assigned_to = auth.uid());

-- RLS Policy: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON public.task_assignment_notifications
  FOR UPDATE
  USING (assigned_to = auth.uid());

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignment_notifications;

-- Trigger to create notification when task is assigned
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Don't notify if user assigned task to themselves
    IF NEW.assigned_to != COALESCE(NEW.last_updated_by, NEW.created_by) THEN
      INSERT INTO public.task_assignment_notifications (
        task_id,
        assigned_to,
        assigned_by
      ) VALUES (
        NEW.id,
        NEW.assigned_to,
        COALESCE(NEW.last_updated_by, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on tasks table
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();