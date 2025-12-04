-- Create transaction_documents table for tracking documents per transaction
CREATE TABLE public.transaction_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL,
  section text,
  title text NOT NULL,
  required boolean DEFAULT false,
  order_index integer DEFAULT 0,
  file_path text,
  file_name text,
  file_size integer,
  uploaded_by uuid REFERENCES public.profiles(id),
  uploaded_at timestamp with time zone,
  status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies: team members can manage their team's transaction documents
CREATE POLICY "Team members can view transaction documents"
ON public.transaction_documents
FOR SELECT
USING (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
);

CREATE POLICY "Team members can create transaction documents"
ON public.transaction_documents
FOR INSERT
WITH CHECK (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
);

CREATE POLICY "Team members can update transaction documents"
ON public.transaction_documents
FOR UPDATE
USING (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
);

CREATE POLICY "Team members can delete transaction documents"
ON public.transaction_documents
FOR DELETE
USING (
  transaction_id IN (
    SELECT id FROM public.transactions 
    WHERE team_id IN (SELECT get_user_team_ids(auth.uid()))
  )
);

-- Index for performance
CREATE INDEX idx_transaction_documents_transaction_id ON public.transaction_documents(transaction_id);