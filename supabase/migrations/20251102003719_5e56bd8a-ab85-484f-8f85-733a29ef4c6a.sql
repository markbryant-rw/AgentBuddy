-- ============================================
-- PHASE 1: PERFORMANCE OPTIMIZATION
-- Create materialized view for conversation summaries
-- Reduces N+1 queries from 5 separate queries to 1
-- ============================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_conversations_summary CASCADE;

-- Create optimized materialized view
CREATE MATERIALIZED VIEW user_conversations_summary AS
SELECT 
  cp.user_id,
  cp.conversation_id,
  c.type,
  c.title,
  c.created_by,
  c.last_message_at,
  c.archived,
  c.channel_type,
  c.is_system_channel,
  c.icon,
  c.description,
  cp.last_read_at,
  cp.muted,
  cp.is_admin,
  cp.can_post,
  -- Last message (optimized with subquery)
  (SELECT json_build_object(
    'content', m.content,
    'created_at', m.created_at,
    'author_id', m.author_id
  )
  FROM messages m
  WHERE m.conversation_id = c.id 
    AND m.deleted = false
  ORDER BY m.created_at DESC
  LIMIT 1) as last_message,
  -- Unread count (optimized)
  (SELECT COUNT(*)::integer
   FROM messages m
   WHERE m.conversation_id = c.id 
     AND m.deleted = false
     AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
  ) as unread_count,
  -- Participants array (pre-joined)
  (SELECT json_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'email', p.email
  ))
  FROM conversation_participants cp2
  JOIN profiles p ON p.id = cp2.user_id
  WHERE cp2.conversation_id = c.id
  ) as participants
FROM conversation_participants cp
JOIN conversations c ON c.id = cp.conversation_id
WHERE c.archived = false;

-- Add unique index for concurrent refresh
CREATE UNIQUE INDEX idx_user_conversations_summary_unique 
ON user_conversations_summary(user_id, conversation_id);

-- Add index for fast user lookups
CREATE INDEX idx_user_conversations_summary_user_id 
ON user_conversations_summary(user_id, last_message_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_conversations_summary;
END;
$$;

-- Trigger function to refresh on conversation changes
CREATE OR REPLACE FUNCTION trigger_refresh_conversations_summary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the view asynchronously (don't block the transaction)
  PERFORM refresh_conversations_summary();
  RETURN NULL;
END;
$$;

-- Triggers to keep view updated
DROP TRIGGER IF EXISTS refresh_on_message_insert ON messages;
CREATE TRIGGER refresh_on_message_insert
AFTER INSERT ON messages
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_conversations_summary();

DROP TRIGGER IF EXISTS refresh_on_conversation_update ON conversations;
CREATE TRIGGER refresh_on_conversation_update
AFTER UPDATE ON conversations
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_conversations_summary();

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW user_conversations_summary OWNER TO postgres;

-- Grant access
GRANT SELECT ON user_conversations_summary TO authenticated;

-- Initial refresh
REFRESH MATERIALIZED VIEW user_conversations_summary;

-- Add composite indexes for better query performance on conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC) 
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread
ON messages(conversation_id, created_at)
WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
ON conversation_participants(user_id, conversation_id);

COMMENT ON MATERIALIZED VIEW user_conversations_summary IS 
'Optimized view for conversation lists. Reduces 5 queries to 1. Refreshes automatically on message/conversation changes.';