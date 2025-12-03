# Fix Duplicate "Mark & Co." Teams

You have two teams with the same name. This guide will help you identify which is the live one and clean up the duplicate.

---

## Step 1: Identify the Teams

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- FIND DUPLICATE "Mark & Co." TEAMS
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
  ) as members
FROM teams t
LEFT JOIN agencies a ON a.id = t.agency_id
WHERE LOWER(t.name) LIKE '%mark%co%'
ORDER BY t.created_at DESC;
```

This will show you both teams with:
- **ID** - The unique identifier
- **created_at** - When it was created
- **is_archived** - Whether it's archived
- **member_count** - How many people are in it
- **members** - Names and emails of team members

---

## Step 2: Determine Which is Live

The **LIVE team** is usually the one with:
- ✅ **More members** (or the only one with members)
- ✅ **Older creation date** (created first)
- ✅ **NOT archived** (is_archived = false)
- ✅ **NOT orphaned** (is_orphan_team = false)

The **DUPLICATE** is usually:
- ❌ Zero members or fewer members
- ❌ Created later (newer date)
- ❌ Possibly archived already
- ❌ Possibly orphaned

---

## Step 3: Archive the Duplicate

Once you've identified which team to KEEP, archive the other one:

```sql
-- ARCHIVE DUPLICATE TEAM
-- Replace TEAM_ID_TO_ARCHIVE with the duplicate's ID

DO $$
DECLARE
  team_to_archive UUID := 'TEAM_ID_HERE'; -- ← PUT DUPLICATE TEAM ID
  team_name TEXT;
  member_count INTEGER;
BEGIN
  -- Get team info
  SELECT name,
    (SELECT COUNT(*) FROM team_members WHERE team_id = teams.id)
  INTO team_name, member_count
  FROM teams
  WHERE id = team_to_archive;

  RAISE NOTICE 'Archiving: % (% members)', team_name, member_count;

  IF member_count > 0 THEN
    RAISE NOTICE '⚠️  Removing % members first', member_count;
    DELETE FROM team_members WHERE team_id = team_to_archive;
  END IF;

  -- Archive the team
  UPDATE teams
  SET is_archived = true
  WHERE id = team_to_archive;

  RAISE NOTICE '✅ Team archived!';
END $$;
```

---

## Step 4: Verify Cleanup

Check that only one "Mark & Co." team remains:

```sql
SELECT
  id,
  name,
  is_archived,
  (SELECT COUNT(*) FROM team_members WHERE team_id = teams.id) as members
FROM teams
WHERE LOWER(name) LIKE '%mark%co%';
```

Should show:
- **1 row** with `is_archived = false` (the live team)
- **1 row** with `is_archived = true` (the archived duplicate) ← This won't show in dropdowns anymore

---

## Step 5: Try Inviting Again

Now when you go to invite Loryn Darroch:
1. You should only see **ONE "Mark & Co."** team in the dropdown
2. Select that team
3. Send the invitation ✅

---

## Alternative: Delete Instead of Archive

If you want to **completely delete** the duplicate (not just archive):

```sql
-- HARD DELETE DUPLICATE TEAM
-- Replace with the duplicate's ID

DO $$
DECLARE
  team_to_delete UUID := 'DUPLICATE_TEAM_ID_HERE';
  member_count INTEGER;
BEGIN
  -- Count members
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = team_to_delete;

  IF member_count > 0 THEN
    RAISE NOTICE 'Removing % members', member_count;
    DELETE FROM team_members WHERE team_id = team_to_delete;
  END IF;

  -- Delete the team
  DELETE FROM teams WHERE id = team_to_delete;

  RAISE NOTICE '✅ Team deleted permanently!';
END $$;
```

**Warning:** This is permanent! Archive is safer.

---

## Need Help?

If you're not sure which team to keep, send me the output from Step 1 and I'll help you identify the live one!
