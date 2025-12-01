-- Create message_polls table
CREATE TABLE message_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  closed BOOLEAN DEFAULT false
);

CREATE INDEX idx_message_polls_message_id ON message_polls(message_id);

-- Create poll_votes table
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES message_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- Add office_channel_id to agencies
ALTER TABLE agencies 
ADD COLUMN office_channel_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX idx_agencies_office_channel ON agencies(office_channel_id);

-- RLS Policies for message_polls
ALTER TABLE message_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view polls in their conversations"
  ON message_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_polls.message_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Message authors can create polls"
  ON message_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_polls.message_id 
      AND m.author_id = auth.uid()
    )
  );

-- RLS Policies for poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote in polls"
  ON poll_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM message_polls mp
      JOIN messages m ON m.id = mp.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE mp.id = poll_votes.poll_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view poll votes"
  ON poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM message_polls mp
      JOIN messages m ON m.id = mp.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE mp.id = poll_votes.poll_id 
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own votes"
  ON poll_votes FOR DELETE
  USING (user_id = auth.uid());

-- Function to create office channel
CREATE OR REPLACE FUNCTION create_office_channel(p_agency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_conversation_id UUID;
  v_agency_name TEXT;
BEGIN
  -- Get agency name
  SELECT name INTO v_agency_name FROM agencies WHERE id = p_agency_id;
  
  -- Create conversation
  INSERT INTO conversations (type, title, channel_type, is_system_channel, description, icon)
  VALUES (
    'group',
    v_agency_name || ' - Office Updates',
    'standard',
    true,
    'Office-wide announcements and updates for all ' || v_agency_name || ' members',
    'building-2'
  )
  RETURNING id INTO v_conversation_id;
  
  -- Link to agency
  UPDATE agencies 
  SET office_channel_id = v_conversation_id 
  WHERE id = p_agency_id;
  
  -- Add all existing office members
  INSERT INTO conversation_participants (conversation_id, user_id, can_post)
  SELECT DISTINCT v_conversation_id, tm.user_id, true
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE t.agency_id = p_agency_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  
  RETURN v_conversation_id;
END;
$$;

-- Function to auto-add to office channel when joining a team
CREATE OR REPLACE FUNCTION auto_add_to_office_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_office_channel_id UUID;
BEGIN
  -- Get the office channel for this team's agency
  SELECT a.office_channel_id INTO v_office_channel_id
  FROM teams t
  JOIN agencies a ON a.id = t.agency_id
  WHERE t.id = NEW.team_id;
  
  -- If office channel exists, add user
  IF v_office_channel_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, can_post)
    VALUES (v_office_channel_id, NEW.user_id, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_add_to_office_channel
AFTER INSERT ON team_members
FOR EACH ROW
EXECUTE FUNCTION auto_add_to_office_channel();

-- Function to vote on poll
CREATE OR REPLACE FUNCTION vote_on_poll(
  p_poll_id UUID,
  p_option_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_allow_multiple BOOLEAN;
BEGIN
  -- Check if poll allows multiple votes
  SELECT allow_multiple INTO v_allow_multiple
  FROM message_polls
  WHERE id = p_poll_id;
  
  -- If single choice, remove existing votes
  IF NOT v_allow_multiple THEN
    DELETE FROM poll_votes
    WHERE poll_id = p_poll_id
    AND user_id = auth.uid();
  END IF;
  
  -- Add new vote
  INSERT INTO poll_votes (poll_id, user_id, option_id)
  VALUES (p_poll_id, auth.uid(), p_option_id)
  ON CONFLICT (poll_id, user_id, option_id) DO NOTHING;
END;
$$;