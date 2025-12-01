-- Create storage bucket for Knowledge Base images
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base-images', 'knowledge-base-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow team members to upload KB images
CREATE POLICY "Team members can upload KB images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-base-images' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Anyone can view KB images (public bucket)
CREATE POLICY "Anyone can view KB images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base-images');

-- RLS Policy: Team members can delete their team's KB images
CREATE POLICY "Team members can delete KB images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-base-images' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members WHERE user_id = auth.uid()
  )
);