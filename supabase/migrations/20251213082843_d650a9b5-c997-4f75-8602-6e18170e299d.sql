-- Add columns for withdrawn sales tracking
ALTER TABLE public.past_sales 
ADD COLUMN IF NOT EXISTS withdrawn_date date,
ADD COLUMN IF NOT EXISTS withdrawal_reason text;

-- Add comment for clarity
COMMENT ON COLUMN public.past_sales.withdrawn_date IS 'Date the listing was withdrawn (for withdrawn status sales)';
COMMENT ON COLUMN public.past_sales.withdrawal_reason IS 'Reason for withdrawal (for withdrawn status sales)';