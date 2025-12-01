-- Fix search_path security warning for get_platform_offices_stats function
DROP FUNCTION IF EXISTS get_platform_offices_stats();

CREATE OR REPLACE FUNCTION get_platform_offices_stats()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  total_users bigint,
  total_teams bigint,
  active_users bigint,
  salesperson_count bigint,
  assistant_count bigint,
  team_leader_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.logo_url,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_personal_team = false) as total_teams,
    COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_users,
    COUNT(DISTINCT CASE WHEN ur.role = 'salesperson' THEN p.id END) as salesperson_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'assistant' THEN p.id END) as assistant_count,
    COUNT(DISTINCT CASE WHEN ur.role = 'team_leader' THEN p.id END) as team_leader_count
  FROM agencies a
  LEFT JOIN profiles p ON p.office_id = a.id
  LEFT JOIN teams t ON t.agency_id = a.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE a.is_archived = false
  GROUP BY a.id, a.name, a.logo_url
  ORDER BY a.name;
END;
$$;