-- =============================================================================
-- Staff Portal Migration
--
-- 1. Adds user_id column to staff table so staff can log in.
-- 2. Adds login_id column to users table for free-text user ID login.
-- 3. Adds plain_password column so admin/owner can view credentials.
-- Safe to re-run.
-- =============================================================================

SET search_path TO public;

-- Add user_id to staff table (links to users table for login)
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);

-- Add login_id to users table (free-text user ID for login)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS login_id VARCHAR(255);

-- Add plain_password to users table (visible to admin/owner only)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Create unique index on login_id (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_id
  ON public.users(login_id) WHERE login_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'user_id'
  ) AS staff_user_id_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'login_id'
  ) AS users_login_id_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plain_password'
  ) AS users_plain_password_exists;
