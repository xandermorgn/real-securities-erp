-- =============================================================================
-- Staff Advances + Salary Date columns
--
-- Adds a `staff_advances` table for recording advance payments.
-- Also adds a `salary_date` column to the `staff` table.
--
-- Safe to re-run (IF NOT EXISTS / idempotent).
-- Run this in the Supabase SQL Editor.
-- =============================================================================

SET search_path TO public;

-- 1. Add salary_date column to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS salary_date DATE;

-- 2. Create staff_advances table
CREATE TABLE IF NOT EXISTS public.staff_advances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  date        DATE NOT NULL,
  remarks     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff ON public.staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_date ON public.staff_advances(date);

-- 3. Enable realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_advances;
EXCEPTION
  WHEN duplicate_object  THEN NULL;
  WHEN undefined_object  THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';

-- 4. Verify
SELECT
  to_regclass('public.staff_advances') AS advances_table_created,
  (SELECT COUNT(*) FROM public.staff_advances) AS advance_row_count,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'staff'
      AND column_name  = 'salary_date'
  ) AS salary_date_column_exists;
