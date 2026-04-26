-- =============================================================================
-- STEP 1 ONLY — run this first in Supabase SQL Editor, then confirm:
--   SELECT to_regclass('public.staff_assignments');
--   (must return: staff_assignments)
--
-- If you get "relation staff or points or shifts does not exist", your base
-- schema is not set up. Run your main database-schema.sql (or from Dashboard)
-- before this migration.
-- =============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  point_id UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_assignments_staff_point_shift_key UNIQUE (staff_id, point_id, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff ON public.staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_point ON public.staff_assignments(point_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_shift ON public.staff_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_active ON public.staff_assignments(active);

-- Sanity check (should return 1 row with column name staff_assignments)
SELECT to_regclass('public.staff_assignments') AS table_created;
