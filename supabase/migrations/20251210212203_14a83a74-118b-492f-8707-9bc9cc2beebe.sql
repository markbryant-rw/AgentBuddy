-- Fix Josh's existing transaction with malformed owner name
UPDATE transactions 
SET owners = '[{"id": "29f34bd3-db9d-41b3-a309-12028c35d629", "name": "Bryan Robinson", "email": "", "phone": "", "is_primary": true}]'::jsonb
WHERE id = 'f18db6b2-5b5d-46cb-9d01-4343897e1256';