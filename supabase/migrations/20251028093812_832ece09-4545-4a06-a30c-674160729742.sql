-- Mark existing single-member teams as solo agents
UPDATE teams 
SET 
  team_type = 'auto_solo', 
  is_auto_created = true
WHERE id IN (
  SELECT team_id 
  FROM team_members 
  GROUP BY team_id 
  HAVING COUNT(*) = 1
);

-- Mark existing multi-member teams as standard teams
UPDATE teams 
SET 
  team_type = 'standard', 
  is_auto_created = false
WHERE id IN (
  SELECT team_id 
  FROM team_members 
  GROUP BY team_id 
  HAVING COUNT(*) > 1
);