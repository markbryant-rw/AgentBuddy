-- Note collaboration and presence tables
CREATE TABLE IF NOT EXISTS note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

CREATE TABLE IF NOT EXISTS note_presence (
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (note_id, user_id)
);

-- Add version history to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]';

-- Enable RLS
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_shares
CREATE POLICY "Users can view shares for their notes"
  ON note_shares FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Note owners can create shares"
  ON note_shares FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) AND invited_by = auth.uid()
  );

CREATE POLICY "Note owners and shared users can delete shares"
  ON note_shares FOR DELETE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- RLS policies for note_presence
CREATE POLICY "Users can view presence for accessible notes"
  ON note_presence FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes 
      WHERE owner_id = auth.uid()
      OR id IN (SELECT note_id FROM note_shares WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own presence"
  ON note_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their presence timestamp"
  ON note_presence FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own presence"
  ON note_presence FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE note_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE note_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE note_comments;