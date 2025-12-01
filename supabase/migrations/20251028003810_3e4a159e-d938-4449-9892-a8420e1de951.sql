-- Add unique index required for concurrent refresh of materialized view
-- This index was missing from the previous migration and is required for 
-- REFRESH MATERIALIZED VIEW CONCURRENTLY to work properly

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_effective_access_new_pk 
ON public.user_effective_access_new(user_id, module_id);