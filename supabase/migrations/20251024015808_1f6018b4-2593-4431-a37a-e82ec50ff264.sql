-- Update the delete_old_coaching_conversations function to use 7 days instead of 5
CREATE OR REPLACE FUNCTION delete_old_coaching_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM coaching_conversations
  WHERE is_starred = false
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;