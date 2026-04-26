-- =============================================================================
-- Phase 3: Field Officer Panel + attendance audit columns
-- Run this in Supabase SQL Editor if field_officers already exists.
-- Safe to re-run.
-- =============================================================================

ALTER TABLE field_officers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL;

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

CREATE INDEX IF NOT EXISTS idx_field_officers_user ON field_officers(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_updated_by ON attendance(updated_by);
CREATE INDEX IF NOT EXISTS idx_staff_timeline_staff ON staff_timeline(staff_id);

ALTER TABLE staff_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timeline_read_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_insert_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_update_all" ON staff_timeline;
DROP POLICY IF EXISTS "timeline_delete_all" ON staff_timeline;

CREATE POLICY "timeline_read_all" ON staff_timeline FOR SELECT USING (true);
CREATE POLICY "timeline_insert_all" ON staff_timeline FOR INSERT WITH CHECK (true);
CREATE POLICY "timeline_update_all" ON staff_timeline FOR UPDATE USING (true);
CREATE POLICY "timeline_delete_all" ON staff_timeline FOR DELETE USING (true);

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

SELECT 'Phase 3 field officer panel schema OK.' AS status;
