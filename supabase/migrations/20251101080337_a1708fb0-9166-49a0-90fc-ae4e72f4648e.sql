-- Add avatar and logo URL columns to service_providers
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for provider avatars/logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-avatars', 'provider-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for provider-avatars bucket
CREATE POLICY "Authenticated users can upload provider avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'provider-avatars');

CREATE POLICY "Authenticated users can update provider avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'provider-avatars');

CREATE POLICY "Anyone can view provider avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'provider-avatars');

CREATE POLICY "Authenticated users can delete provider avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'provider-avatars');