-- =============================================
-- Migration: Avatar Storage Bucket
-- Creates the public 'avatars' bucket and
-- sets RLS policies so users can upload / view
-- their own profile photo.
-- =============================================

-- 1. Create the avatars bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,          -- public: URLs are readable without auth
  5242880,       -- 5 MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp'];

-- 2. Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can upload their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars"              ON storage.objects;

-- 3. Allow authenticated users to INSERT into avatars/<their-user-id>.*
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'avatars'
  AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
);

-- 4. Allow authenticated users to UPDATE their own file (upsert)
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
);

-- 5. Allow authenticated users to DELETE their own file
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(storage.filename(name), '.', 1) = auth.uid()::text
);

-- 6. Allow anyone (including anon) to read avatar objects (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
