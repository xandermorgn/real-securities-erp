-- Delete existing test users and recreate with fresh hash
-- Run this in Supabase SQL Editor

-- First, delete existing test users if they exist
DELETE FROM users WHERE email IN ('owner@realsecurity.com', 'admin@realsecurity.com');

-- Insert fresh test users with a newly generated hash
-- Password: password123
INSERT INTO users (name, role, email, phone, password_hash) VALUES
  ('System Owner', 'owner', 'owner@realsecurity.com', '9999999999', '$2a$10$K3kJZGhLW0xYqF5YqF5YqewN8P9vXkZYqF5YqF5YqF5YqF5YqF5Y'),
  ('System Admin', 'admin', 'admin@realsecurity.com', '8888888888', '$2a$10$K3kJZGhLW0xYqF5YqF5YqewN8P9vXkZYqF5YqF5YqF5YqF5YqF5Y');

-- Verify users were created
SELECT id, name, role, email, phone, created_at FROM users WHERE email IN ('owner@realsecurity.com', 'admin@realsecurity.com');
