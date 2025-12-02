-- Add transaction_id column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);