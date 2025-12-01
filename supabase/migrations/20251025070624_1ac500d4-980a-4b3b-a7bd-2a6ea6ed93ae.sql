-- Migration: Add Channel Types and Features to Messages
-- Add channel type support to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS channel_type TEXT CHECK (channel_type IN ('standard', 'announcement')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_system_channel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- Add participant permissions and settings
ALTER TABLE conversation_participants 
ADD COLUMN IF NOT EXISTS can_post BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT false;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  mention_notifications BOOLEAN DEFAULT true,
  dm_notifications BOOLEAN DEFAULT true,
  group_notifications BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reactions;
CREATE POLICY "Users can manage their own reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own reactions" ON message_reactions;
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());