-- Add bank details columns to staff table
-- Run this in Supabase SQL Editor

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(255);
