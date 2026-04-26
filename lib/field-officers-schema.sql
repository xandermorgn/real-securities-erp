-- =============================================================================
-- Field officers — run this ENTIRE script in Supabase SQL Editor (one paste).
-- If you see "relation field_officers does not exist", you ran ALTER-only
-- snippets before creating the table — use this file from the top.
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY/TRIGGER IF EXISTS.
-- Requires: public.points table must already exist (from main ERP schema).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  dob DATE,
  blood_group VARCHAR(10),
  address TEXT,
  aadhaar_url TEXT,
  police_verification_url TEXT,
  photo_url TEXT,
  shift VARCHAR(100),
  joining_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  da DECIMAL(10, 2),
  pf DECIMAL(10, 2),
  esi DECIMAL(10, 2),
  bonus DECIMAL(10, 2),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  account_holder_name VARCHAR(255),
  branch VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If you created field_officers earlier without these columns, add them here:
ALTER TABLE field_officers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS salary DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS da DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS pf DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS esi DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS bonus DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS branch VARCHAR(255);

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS staff_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_officer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_officer_id UUID NOT NULL REFERENCES field_officers(id) ON DELETE CASCADE,
  point_id UUID NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(field_officer_id, point_id)
);

CREATE INDEX IF NOT EXISTS idx_field_officer_points_officer
  ON field_officer_points(field_officer_id);

CREATE INDEX IF NOT EXISTS idx_field_officer_points_point
  ON field_officer_points(point_id);

CREATE INDEX IF NOT EXISTS idx_field_officers_user
  ON field_officers(user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_updated_by
  ON attendance(updated_by);

CREATE INDEX IF NOT EXISTS idx_staff_timeline_staff
  ON staff_timeline(staff_id);

-- -----------------------------------------------------------------------------
-- 2) updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_field_officer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS field_officers_updated_at ON field_officers;
CREATE TRIGGER field_officers_updated_at
  BEFORE UPDATE ON field_officers
  FOR EACH ROW
  EXECUTE FUNCTION update_field_officer_updated_at();

-- -----------------------------------------------------------------------------
-- 3) RLS + policies (idempotent)
-- -----------------------------------------------------------------------------
ALTER TABLE field_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_officer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_timeline ENABLE ROW LEVEL SECURITY;

-- Remove legacy policy names from older versions of this script
DROP POLICY IF EXISTS "Enable read access for all users" ON field_officers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON field_officers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON field_officers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON field_officers;
DROP POLICY IF EXISTS "Enable read access for all users" ON field_officer_points;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON field_officer_points;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON field_officer_points;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON field_officer_points;

DROP POLICY IF EXISTS "fo_read_all" ON field_officers;
DROP POLICY IF EXISTS "fo_insert_all" ON field_officers;
DROP POLICY IF EXISTS "fo_update_all" ON field_officers;
DROP POLICY IF EXISTS "fo_delete_all" ON field_officers;
DROP POLICY IF EXISTS "fop_read_all" ON field_officer_points;
DROP POLICY IF EXISTS "fop_insert_all" ON field_officer_points;
DROP POLICY IF EXISTS "fop_update_all" ON field_officer_points;
DROP POLICY IF EXISTS "fop_delete_all" ON field_officer_points;
DROP POLICY IF EXISTS "timeline_read_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_insert_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_update_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_delete_all" ON staff_timeline;

-- Short policy names avoid duplicate-name errors if old policies existed
CREATE POLICY "fo_read_all" ON field_officers FOR SELECT USING (true);
CREATE POLICY "fo_insert_all" ON field_officers FOR INSERT WITH CHECK (true);
CREATE POLICY "fo_update_all" ON field_officers FOR UPDATE USING (true);
CREATE POLICY "fo_delete_all" ON field_officers FOR DELETE USING (true);

CREATE POLICY "fop_read_all" ON field_officer_points FOR SELECT USING (true);
CREATE POLICY "fop_insert_all" ON field_officer_points FOR INSERT WITH CHECK (true);
CREATE POLICY "fop_update_all" ON field_officer_points FOR UPDATE USING (true);
CREATE POLICY "fop_delete_all" ON field_officer_points FOR DELETE USING (true);

CREATE POLICY "timeline_read_all" ON staff_timeline FOR SELECT USING (true);
CREATE POLICY "timeline_insert_all" ON staff_timeline FOR INSERT WITH CHECK (true);
CREATE POLICY "timeline_update_all" ON staff_timeline FOR UPDATE USING (true);
CREATE POLICY "timeline_delete_all" ON staff_timeline FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 4) Realtime (optional but recommended for live UI)
-- In Dashboard: Database → Replication → enable for field_officers &
-- field_officer_points if not already on. Or run (may require sufficient role):
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE field_officers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE field_officer_points;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE staff_timeline;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 5) Verify
-- -----------------------------------------------------------------------------
SELECT 'field_officers' AS table_name, COUNT(*)::bigint AS row_count FROM field_officers
UNION ALL
SELECT 'field_officer_points', COUNT(*)::bigint FROM field_officer_points;

SELECT 'Field officers schema OK — tables exist.' AS status;
