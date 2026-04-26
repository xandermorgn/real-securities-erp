-- Authentication Setup for Real Securities ERP
-- Run this in Supabase SQL Editor to set up authentication

-- Users table already exists in database-schema.sql
-- This file adds initial users for testing

-- Add unique index on email if not exists
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email) WHERE email IS NOT NULL;

-- Add unique index on phone if not exists
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users(phone) WHERE phone IS NOT NULL;

-- Insert default owner and admin accounts
-- Password for all: "password123" (hashed with bcrypt, 10 rounds)
-- IMPORTANT: Change these passwords in production!

INSERT INTO users (name, role, email, phone, password_hash) VALUES
  ('System Owner', 'owner', 'owner@realsecurity.com', '9999999999', '$2b$10$rG7qHqKVZ5y3hX.X5dYZsOMx6QZkH0jN8WqYqJ.vkEJKJ8HqXqJ8W'),
  ('System Admin', 'admin', 'admin@realsecurity.com', '8888888888', '$2b$10$rG7qHqKVZ5y3hX.X5dYZsOMx6QZkH0jN8WqYqJ.vkEJKJ8HqXqJ8W')
ON CONFLICT (email) DO NOTHING;

-- Note: The password_hash above is for "password123"
-- Generated using: bcrypt.hash('password123', 10)

-- Test credentials:
-- Owner: email: owner@realsecurity.com, password: password123
-- Admin: email: admin@realsecurity.com, password: password123
