-- Revert materialized view changes - move them back to public schema
ALTER MATERIALIZED VIEW private.user_conversations_summary SET SCHEMA public;
ALTER MATERIALIZED VIEW private.user_effective_access_new SET SCHEMA public;
ALTER MATERIALIZED VIEW private.kpi_aggregates SET SCHEMA public;

-- Restore refresh functions to reference public schema
CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$function$;