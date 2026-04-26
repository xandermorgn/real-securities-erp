-- Create test users with fresh password hash
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Delete existing test users (if any)
DELETE FROM users WHERE email IN ('owner@realsecurity.com', 'admin@realsecurity.com');

-- Step 2: Insert test users with freshly generated hash
-- Password for both accounts: password123
INSERT INTO users (name, role, email, phone, password_hash) VALUES
  ('System Owner', 'owner', 'owner@realsecurity.com', '9999999999', '$2b$10$wLlKKjo6rWw61lTDBBy9BuGKNesxKqGvyVdVXynUGuLZAJgi4.yTS'),
  ('System Admin', 'admin', 'admin@realsecurity.com', '8888888888', '$2b$10$wLlKKjo6rWw61lTDBBy9BuGKNesxKqGvyVdVXynUGuLZAJgi4.yTS');

-- Step 3: Verify the users were created successfully
SELECT 
  id, 
  name, 
  role, 
  email, 
  phone,
  created_at,
  substring(password_hash, 1, 20) || '...' as password_hash_preview
FROM users 
WHERE email IN ('owner@realsecurity.com', 'admin@realsecurity.com')
ORDER BY role;
