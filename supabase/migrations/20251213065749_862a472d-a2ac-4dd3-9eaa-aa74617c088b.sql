-- Add referral_source_id to past_sales for tracking referral connections
ALTER TABLE public.past_sales 
ADD COLUMN IF NOT EXISTS referral_source_id uuid REFERENCES public.past_sales(id);

-- Add reminder_sent_at to tasks for tracking email reminders
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_past_sales_referral_source ON public.past_sales(referral_source_id) WHERE referral_source_id IS NOT NULL;

-- Create index for aftercare task reminders
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_sent ON public.tasks(reminder_sent_at) WHERE past_sale_id IS NOT NULL;