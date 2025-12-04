-- Add missing columns to transaction_documents for template compatibility
ALTER TABLE public.transaction_documents
ADD COLUMN IF NOT EXISTS assignees text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;