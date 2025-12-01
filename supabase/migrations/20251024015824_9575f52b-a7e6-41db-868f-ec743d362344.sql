-- Fix search_path security warning for delete_old_coaching_conversations function
CREATE OR REPLACE FUNCTION delete_old_coaching_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM coaching_conversations
  WHERE is_starred = false
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;