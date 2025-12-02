-- Add missing columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings_pipeline(id),
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id),
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 0;

-- Add bio column to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add created_by column to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_listing_id ON public.tasks(listing_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON public.goals(created_by);