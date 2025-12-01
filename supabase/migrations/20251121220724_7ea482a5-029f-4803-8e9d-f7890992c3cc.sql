-- Drop and recreate functions to add SET search_path
-- Safe to drop as we're recreating immediately with same logic

DROP FUNCTION IF EXISTS public.get_cross_office_assignments();
DROP FUNCTION IF EXISTS public.get_orphaned_team_members();
DROP FUNCTION IF EXISTS public.check_data_health();

-- Recreate with SET search_path

CREATE FUNCTION public.get_cross_office_assignments()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_office_id uuid,
  user_office_name text,
  team_id uuid,
  team_name text,
  team_office_id uuid,
  team_office_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.office_id as user_office_id,
    a1.name as user_office_name,
    t.id as team_id,
    t.name as team_name,
    t.agency_id as team_office_id,
    a2.name as team_office_name
  FROM profiles p
  INNER JOIN team_members tm ON tm.user_id = p.id
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN agencies a1 ON a1.id = p.office_id
  LEFT JOIN agencies a2 ON a2.id = t.agency_id
  WHERE p.office_id IS NOT NULL 
    AND t.agency_id IS NOT NULL
    AND p.office_id != t.agency_id;
END;
$$;

CREATE FUNCTION public.get_orphaned_team_members()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_email text,
  team_id uuid,
  team_name text,
  issue text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.user_id,
    p.full_name as user_name,
    p.email as user_email,
    tm.team_id,
    t.name as team_name,
    CASE 
      WHEN p.id IS NULL THEN 'user_not_found'
      WHEN t.id IS NULL THEN 'team_not_found'
      ELSE 'unknown'
    END as issue
  FROM team_members tm
  LEFT JOIN profiles p ON p.id = tm.user_id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE p.id IS NULL OR t.id IS NULL;
END;
$$;

CREATE FUNCTION public.check_data_health()
RETURNS TABLE (
  check_name text,
  severity text,
  issue_count bigint,
  details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cross_office_assignments'::text,
    'critical'::text,
    COUNT(*)::bigint,
    jsonb_agg(row_to_json(coa.*))
  FROM get_cross_office_assignments() coa
  UNION ALL
  SELECT 
    'orphaned_team_members'::text,
    'warning'::text,
    COUNT(*)::bigint,
    jsonb_agg(row_to_json(otm.*))
  FROM get_orphaned_team_members() otm;
END;
$$;

-- Update remaining functions (simpler - just adding SET search_path)

CREATE OR REPLACE FUNCTION public.refresh_conversations_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_conversations_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_aggregates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.kpi_aggregates;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_user_effective_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_effective_access_new;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_conversations_summary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  PERFORM refresh_conversations_summary();
  RETURN NULL;
END;
$$;