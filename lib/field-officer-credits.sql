-- =============================================================================
-- Field Officer Credits — run in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS field_officer_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id  UUID NOT NULL REFERENCES field_officers(id) ON DELETE CASCADE,
  amount      DECIMAL(10, 2) NOT NULL,
  label       VARCHAR(255),          -- e.g. "Salary", "Bonus", "DA June"
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fo_credits_officer ON field_officer_credits(officer_id);
CREATE INDEX IF NOT EXISTS idx_fo_credits_from    ON field_officer_credits(from_date);
