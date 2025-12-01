-- Create transactions table for transaction coordinating module
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  created_by UUID NOT NULL,
  last_edited_by UUID NOT NULL,
  
  -- Property details
  address TEXT NOT NULL,
  listing_id UUID,
  
  -- Client details
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  
  -- Transaction details
  status TEXT NOT NULL DEFAULT 'lead',
  sale_price NUMERIC,
  expected_settlement DATE,
  contract_date DATE,
  unconditional_date DATE,
  settlement_date DATE,
  
  -- Notes and metadata
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Team members can view transactions
CREATE POLICY "Team members can view transactions"
ON public.transactions
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can insert transactions
CREATE POLICY "Team members can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Team members can update transactions
CREATE POLICY "Team members can update transactions"
ON public.transactions
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Team members can delete transactions
CREATE POLICY "Team members can delete transactions"
ON public.transactions
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_expected_settlement ON public.transactions(expected_settlement);