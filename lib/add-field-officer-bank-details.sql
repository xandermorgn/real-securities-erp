-- Add bank details columns to field_officers table
-- Run this in Supabase SQL Editor

ALTER TABLE field_officers 
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(255);

SELECT 'Bank details columns added to field_officers table successfully!' as status;
