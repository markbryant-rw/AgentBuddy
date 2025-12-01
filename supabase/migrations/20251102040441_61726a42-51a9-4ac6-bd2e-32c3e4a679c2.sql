-- Create function to increment module visit count
CREATE OR REPLACE FUNCTION increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE module_usage_stats
  SET 
    visit_count = visit_count + 1,
    last_visited_at = now()
  WHERE user_id = p_user_id AND module_id = p_module_id;
END;
$$;