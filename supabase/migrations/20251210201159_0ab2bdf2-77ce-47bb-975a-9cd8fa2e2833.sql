-- Fix Mark Mcparty's invitation to be solo agent
UPDATE pending_invitations 
SET team_id = NULL 
WHERE id = '0bf480bc-9c4f-4c6c-8de7-45fb18d13e99';

-- Hard delete the archived duplicate team
DELETE FROM teams 
WHERE id = 'd248e004-ad9a-445e-88c6-b25ea0f11c46' 
  AND is_archived = true;