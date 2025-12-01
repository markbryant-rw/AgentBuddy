-- Create transaction_documents table
CREATE TABLE IF NOT EXISTS transaction_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  stage TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  uploaded BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ,
  uploaded_by UUID,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transaction_docs_transaction ON transaction_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_docs_stage ON transaction_documents(stage);

-- Enable RLS
ALTER TABLE transaction_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transaction documents"
  ON transaction_documents FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create transaction documents"
  ON transaction_documents FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update transaction documents"
  ON transaction_documents FOR UPDATE
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete transaction documents"
  ON transaction_documents FOR DELETE
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );