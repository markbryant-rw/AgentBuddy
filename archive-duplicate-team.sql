-- ARCHIVE DUPLICATE TEAM
-- Replace TEAM_ID_TO_ARCHIVE with the ID of the team you want to remove

DO $$
DECLARE
  team_to_archive UUID := 'TEAM_ID_TO_ARCHIVE'; -- ← PUT THE DUPLICATE TEAM ID HERE
  team_name TEXT;
  member_count INTEGER;
BEGIN
  -- Get team info
  SELECT name INTO team_name
  FROM teams
  WHERE id = team_to_archive;

  -- Count members
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = team_to_archive;

  RAISE NOTICE '=== ARCHIVING TEAM ===';
  RAISE NOTICE 'Team: %', team_name;
  RAISE NOTICE 'ID: %', team_to_archive;
  RAISE NOTICE 'Members: %', member_count;
  RAISE NOTICE '';

  IF member_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: This team has % member(s)!', member_count;
    RAISE NOTICE 'Members will be removed from this team.';
    RAISE NOTICE 'Make sure they are already in the LIVE team!';
    RAISE NOTICE '';

    -- Remove team members
    DELETE FROM team_members WHERE team_id = team_to_archive;
    RAISE NOTICE 'Removed % team member(s)', member_count;
  END IF;

  -- Archive the team
  UPDATE teams
  SET is_archived = true
  WHERE id = team_to_archive;

  RAISE NOTICE '✅ Team archived successfully!';
  RAISE NOTICE '';

END $$;
