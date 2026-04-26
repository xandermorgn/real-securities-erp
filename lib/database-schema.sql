-- Real Securities ERP — run once in Supabase SQL Editor (Dashboard → SQL → New query).
-- Uses gen_random_uuid() (built into current Supabase Postgres; no uuid-ossp needed).

-- ---------------------------------------------------------------------------
-- Optional: reset (only if you need a clean reinstall — deletes all ERP data)
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS staff CASCADE;
-- DROP TABLE IF EXISTS points CASCADE;
-- DROP TABLE IF EXISTS areas CASCADE;
-- DROP TABLE IF EXISTS shifts CASCADE;
-- DROP TABLE IF EXISTS designations CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'field_officer')),
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  dob DATE,
  blood_group VARCHAR(10),
  address TEXT,
  aadhaar_url TEXT,
  police_verification_url TEXT,
  photo_url TEXT,
  salary_type VARCHAR(50) CHECK (salary_type IN ('flat_rate', 'compliance')),
  salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
  da NUMERIC(10, 2) NOT NULL DEFAULT 0,
  pf NUMERIC(10, 2) NOT NULL DEFAULT 0,
  esi NUMERIC(10, 2) NOT NULL DEFAULT 0,
  bonus NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ot NUMERIC(10, 2) NOT NULL DEFAULT 0,
  designation VARCHAR(100),
  shift VARCHAR(100),
  joining_date DATE,
  point_id UUID REFERENCES points(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  point_id UUID NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'leave', 'absent')),
  shift VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

CREATE INDEX idx_staff_point ON staff(point_id);
CREATE INDEX idx_attendance_staff ON attendance(staff_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_points_area ON points(area_id);

-- ---------------------------------------------------------------------------
-- Seed data (safe to re-run if you use ON CONFLICT)
-- ---------------------------------------------------------------------------

INSERT INTO shifts (name, start_time, end_time) VALUES
  ('8 AM - 8 PM', '08:00:00', '20:00:00'),
  ('8 PM - 8 AM', '20:00:00', '08:00:00'),
  ('8 AM - 4 PM', '08:00:00', '16:00:00'),
  ('4 PM - 12 AM', '16:00:00', '00:00:00'),
  ('12 AM - 8 AM', '00:00:00', '08:00:00')
ON CONFLICT (name) DO NOTHING;

INSERT INTO designations (name) VALUES
  ('Guard'),
  ('Supervisor'),
  ('Head Guard'),
  ('Dog Squad'),
  ('Security Officer'),
  ('Gunman'),
  ('Laborer'),
  ('Forklift'),
  ('OP'),
  ('BO'),
  ('Housekeeping')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_points_updated_at
  BEFORE UPDATE ON points
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Storage: create buckets in Dashboard → Storage → New bucket
--   - staff-photos (public or private per your policy)
--   - documents (aadhaar / police verification)
-- Then add RLS policies as needed. Service role bypasses RLS for the Express API.
-- ---------------------------------------------------------------------------
