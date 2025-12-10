-- Fix corrupted owner data for 265 Sturges Road transaction
UPDATE transactions 
SET owners = '[{"id": "39402f5b-b708-42b5-91c6-a6b61d8db666", "name": "Alistair Hines", "email": "", "phone": "", "is_primary": true}]'::jsonb
WHERE id = '95f06052-b626-4d70-b018-282d3caa230d';