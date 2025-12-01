-- Fix unread count to exclude user's own messages
DROP MATERIALIZED VIEW IF EXISTS user_conversations_summary CASCADE;

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
  -- Unread count (fixed to exclude user's own messages)
  (SELECT COUNT(*)::integer
   FROM messages m
   WHERE m.conversation_id = c.id 
     AND m.deleted = false
     AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
     AND m.author_id != cp.user_id
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

-- Recreate indexes
CREATE UNIQUE INDEX idx_user_conversations_summary_unique 
ON user_conversations_summary(user_id, conversation_id);

CREATE INDEX idx_user_conversations_summary_user_id 
ON user_conversations_summary(user_id, last_message_at DESC);

-- Refresh the view
REFRESH MATERIALIZED VIEW user_conversations_summary;