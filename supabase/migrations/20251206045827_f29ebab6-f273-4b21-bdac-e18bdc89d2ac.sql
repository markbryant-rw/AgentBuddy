-- Create storage bucket for transaction documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-documents', 'transaction-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their team's folder
CREATE POLICY "Users can upload transaction documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'transaction-documents' AND
  -- Folder structure: {team_id}/{transaction_id}/{filename}
  (storage.foldername(name))[1] IS NOT NULL
);

-- Allow users to view documents from their team's transactions
CREATE POLICY "Users can view transaction documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'transaction-documents'
);

-- Allow users to delete their team's documents
CREATE POLICY "Users can delete transaction documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'transaction-documents'
);