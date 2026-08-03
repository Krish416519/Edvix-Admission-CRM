-- Setup for Supabase Storage Buckets and RLS Policies

-- Create 'documents' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: Admins full access to documents bucket
CREATE POLICY "Admins full access to documents storage"
ON storage.objects FOR ALL
USING (bucket_id = 'documents' AND public.is_admin());

-- Policy: Counselors, Partners, Universities can insert documents
CREATE POLICY "Users can insert documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND public.user_role() IN ('Counselor', 'Partner', 'University'));

-- Policy: Counselors, Partners, Universities, Accounts can view documents
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND public.user_role() IN ('Counselor', 'Partner', 'University', 'Accounts'));

-- Policy: Counselors, Partners, Universities can update documents
CREATE POLICY "Users can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND public.user_role() IN ('Counselor', 'Partner', 'University'));

-- Policy: Counselors, Partners, Universities can delete documents
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND public.user_role() IN ('Counselor', 'Partner', 'University'));
