-- Create agency-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-logos', 'agency-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for agency-logos bucket
CREATE POLICY "Anyone can view agency logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency-logos');

CREATE POLICY "Authorized users can upload agency logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agency-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authorized users can update agency logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authorized users can delete agency logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agency-logos'
  AND auth.uid() IS NOT NULL
);