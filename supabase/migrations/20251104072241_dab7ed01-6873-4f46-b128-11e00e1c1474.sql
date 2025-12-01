CREATE OR REPLACE FUNCTION public.increment_module_visit(p_user_id uuid, p_module_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.module_usage_stats (user_id, module_id, visit_count, last_visited_at)
  VALUES (p_user_id, p_module_id, 1, now())
  ON CONFLICT (user_id, module_id)
  DO UPDATE SET
    visit_count = public.module_usage_stats.visit_count + 1,
    last_visited_at = now();
END;
$$;