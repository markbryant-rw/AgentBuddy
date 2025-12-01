-- Create transaction_notes table
CREATE TABLE transaction_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  reactions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_transaction_notes_transaction_id ON transaction_notes(transaction_id);
CREATE INDEX idx_transaction_notes_created_at ON transaction_notes(created_at DESC);

-- Enable RLS
ALTER TABLE transaction_notes ENABLE ROW LEVEL SECURITY;

-- Team members can view notes for their transactions
CREATE POLICY "Team members can view transaction notes"
  ON transaction_notes FOR SELECT
  USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Team members can create notes
CREATE POLICY "Team members can create transaction notes"
  ON transaction_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Users can update notes (for reactions)
CREATE POLICY "Users can update transaction notes"
  ON transaction_notes FOR UPDATE
  USING (
    transaction_id IN (
      SELECT t.id FROM transactions t
      JOIN team_members tm ON tm.team_id = t.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Authors can delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON transaction_notes FOR DELETE
  USING (author_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_notes;