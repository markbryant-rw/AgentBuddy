-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for post-images bucket
CREATE POLICY "Users can upload their own post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Post images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post-images');

CREATE POLICY "Users can update their own post images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add images column to social_posts table
ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_social_posts_images ON social_posts USING GIN(images);