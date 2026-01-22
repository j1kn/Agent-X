-- Check RLS and Schema for LinkedIn Connection Issues
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled on connected_accounts
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'connected_accounts';

-- 2. Check RLS policies on connected_accounts
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'connected_accounts';

-- 3. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'connected_accounts'
ORDER BY ordinal_position;

-- 4. Check constraints
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
  END AS constraint_description,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'connected_accounts';

-- 5. Test INSERT permission (will fail if RLS blocks it)
-- This is a dry run - it will be rolled back
BEGIN;
  INSERT INTO connected_accounts (
    user_id,
    platform,
    platform_user_id,
    access_token,
    username,
    is_active
  ) VALUES (
    auth.uid(), -- Current user
    'linkedin',
    'test_person_id',
    'test_encrypted_token',
    'Test Profile',
    true
  );
  
  -- Check if it was inserted
  SELECT 
    'INSERT TEST: SUCCESS' as result,
    id,
    platform,
    username
  FROM connected_accounts
  WHERE platform = 'linkedin'
  AND user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
ROLLBACK;

-- 6. Check if platform enum includes 'linkedin'
SELECT 
  enumlabel,
  enumsortorder
FROM pg_enum
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'platform'
)
ORDER BY enumsortorder;

-- 7. Recommended RLS policies if missing
-- Copy and run these if RLS is blocking inserts:

/*
-- Enable RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert own accounts"
ON connected_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own accounts
CREATE POLICY "Users can view own accounts"
ON connected_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own accounts
CREATE POLICY "Users can update own accounts"
ON connected_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete own accounts"
ON connected_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
*/
