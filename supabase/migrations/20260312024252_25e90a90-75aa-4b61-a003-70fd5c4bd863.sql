-- Create client-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- Allow public read access
CREATE POLICY "Public can read client documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-documents');

-- Allow anon uploads (for client portal access without auth)
CREATE POLICY "Anon users can upload client documents"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-documents');