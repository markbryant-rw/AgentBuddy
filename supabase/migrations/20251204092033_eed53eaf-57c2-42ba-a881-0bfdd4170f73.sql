-- Add missing columns for transaction task templates
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS section text,
ADD COLUMN IF NOT EXISTS transaction_stage text;

-- Add index for better querying by transaction and stage
CREATE INDEX IF NOT EXISTS idx_tasks_transaction_stage ON public.tasks(transaction_id, transaction_stage) WHERE transaction_id IS NOT NULL;