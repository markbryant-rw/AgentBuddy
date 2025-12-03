-- FIND DUPLICATE "Mark & Co." TEAMS
-- This will show you both teams with all their details

SELECT
  t.id,
  t.name,
  t.created_at,
  t.is_archived,
  t.is_orphan_team,
  t.is_personal_team,
  t.agency_id,
  a.name as office_name,
  -- Count team members
  (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
  -- List team members
  (
    SELECT STRING_AGG(p.full_name || ' (' || p.email || ')', ', ')
    FROM team_members tm
    JOIN profiles p ON p.id = tm.user_id
    WHERE tm.team_id = t.id
  ) as members,
  -- Show who created it (if available)
  t.created_by,
  creator.full_name as created_by_name
FROM teams t
LEFT JOIN agencies a ON a.id = t.agency_id
LEFT JOIN profiles creator ON creator.id = t.created_by
WHERE LOWER(t.name) LIKE '%mark%co%'
ORDER BY t.created_at DESC;
