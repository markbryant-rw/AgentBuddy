-- Move mark.mcparty from solo agent to Mark & Co. team
UPDATE pending_invitations 
SET team_id = '2e06f1ab-5549-4440-bd0c-fd1dd8ea4ec3'
WHERE email = 'mark.mcparty@gmail.com' 
AND status = 'pending';