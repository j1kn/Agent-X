-- ============================================
-- Supabase Storage Setup for Post Images
-- ============================================
-- This creates the storage bucket and policies
-- for storing generated images permanently.
--
-- INSTRUCTIONS:
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create storage bucket for post images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up storage policies for public access

-- Policy 1: Allow public read access to all images
CREATE POLICY IF NOT EXISTS "Public read access for post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- Policy 2: Allow authenticated users to upload images
CREATE POLICY IF NOT EXISTS "Authenticated users can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Policy 3: Allow service role to upload images (for cron jobs)
CREATE POLICY IF NOT EXISTS "Service role can upload post images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'post-images');

-- Policy 4: Allow users to update their own images
CREATE POLICY IF NOT EXISTS "Users can update their own post images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 5: Allow users to delete their own images
CREATE POLICY IF NOT EXISTS "Users can delete their own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- Verify bucket and policies were created
-- ============================================
SELECT * FROM storage.buckets WHERE id = 'post-images';

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%post images%';

-- ============================================
-- Test image upload (optional)
-- ============================================
-- You can test uploading an image via the Supabase Dashboard:
-- 1. Go to Storage → post-images bucket
-- 2. Upload a test image
-- 3. Verify it's publicly accessible
-- 4. Check the URL format: https://[project-ref].supabase.co/storage/v1/object/public/post-images/[user-id]/[timestamp].png

-- ============================================
-- Storage bucket configuration
-- ============================================
-- Bucket: post-images
-- Public: true (images are publicly accessible)
-- File size limit: 50MB (Supabase default)
-- Allowed MIME types: image/* (all image types)
-- 
-- File structure:
-- post-images/
--   └── [user-id]/
--       ├── [timestamp1].png
--       ├── [timestamp2].png
--       └── ...
--
-- This structure:
-- - Organizes images by user
-- - Prevents filename conflicts with timestamps
-- - Allows easy cleanup per user
-- - Maintains permanent storage (images don't disappear)
