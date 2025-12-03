-- Fix any listings_pipeline records with incorrect team_id from data import
UPDATE listings_pipeline
SET team_id = '2e06f1ab-5549-4440-bd0c-fd1dd8ea4ec3'
WHERE team_id = 'd248e004-ad9a-445e-88c6-b25ea0f11c46';