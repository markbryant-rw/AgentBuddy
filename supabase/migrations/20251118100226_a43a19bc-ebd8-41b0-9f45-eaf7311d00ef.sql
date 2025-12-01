-- Remove unique_user_team constraint to allow users to be in multiple teams
-- This is necessary for Office Managers who need to create and manage multiple teams

ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS unique_user_team;