-- Remove office_manager role from demo user (keep only salesperson and team_leader)
DELETE FROM user_roles 
WHERE user_id = 'e46c7943-70f4-4283-b06f-178671673301' 
AND role = 'office_manager';

-- Ensure active_role is set to salesperson (not office_manager)
UPDATE profiles 
SET active_role = 'salesperson' 
WHERE email = 'demo@agentbuddy.co' AND active_role = 'office_manager';