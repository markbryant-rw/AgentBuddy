-- Bulk update all appraisals to set Mark Bryant as the lead agent
UPDATE logged_appraisals 
SET agent_id = 'be8de55d-ae51-4c4a-9b14-9fc06f67334d'
WHERE user_id = 'be8de55d-ae51-4c4a-9b14-9fc06f67334d'
  AND (agent_id IS NULL OR agent_id != 'be8de55d-ae51-4c4a-9b14-9fc06f67334d');