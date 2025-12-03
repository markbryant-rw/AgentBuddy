-- Create feedback-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone authenticated to upload feedback attachments
CREATE POLICY "Users can upload feedback attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

-- Allow public read access to feedback attachments
CREATE POLICY "Feedback attachments are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'feedback-attachments');

-- Allow users to delete their own feedback attachments
CREATE POLICY "Users can delete own feedback attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);