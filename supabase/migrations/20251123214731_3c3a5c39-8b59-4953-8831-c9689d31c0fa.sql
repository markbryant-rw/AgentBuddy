-- Make feedback-attachments bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'feedback-attachments';

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Public read access for feedback attachments" ON storage.objects;

CREATE POLICY "Public read access for feedback attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-attachments');