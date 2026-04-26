-- =============================================================================
-- Multi-shift attendance migration (FULL — all in one run)
--
-- If you get: relation "staff_assignments" does not exist
--   → You ran only part of the script, OR Step 1 never succeeded. Use instead:
--      1) multi-shift-attendance-step1-create-table.sql  (run first, confirm)
--      2) multi-shift-attendance-step2-rest.sql          (run second)
--
-- Requires existing public tables: staff, points, shifts, attendance.
-- Safe to re-run (IF NOT EXISTS / idempotent patterns).
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

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.staff_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marked_by_role VARCHAR(20);

INSERT INTO public.staff_assignments (staff_id, point_id, shift_id, active)
SELECT s.id, s.point_id, sh.id, TRUE
FROM public.staff s
JOIN public.shifts sh ON LOWER(TRIM(sh.name::text)) = LOWER(TRIM(s.shift::text))
WHERE s.point_id IS NOT NULL
  AND s.shift IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = s.id
      AND sa.point_id = s.point_id
      AND sa.shift_id = sh.id
  );

UPDATE public.attendance a
SET assignment_id = sa.id,
    marked_at = COALESCE(a.marked_at, a.updated_at, a.created_at),
    marked_by_role = COALESCE(a.marked_by_role, 'admin')
FROM public.staff_assignments sa
JOIN public.shifts sh ON sh.id = sa.shift_id
WHERE a.assignment_id IS NULL
  AND a.staff_id = sa.staff_id
  AND a.point_id = sa.point_id
  AND (
    a.shift IS NULL
    OR LOWER(TRIM(a.shift::text)) = LOWER(TRIM(sh.name::text))
  );

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_staff_id_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_assignment_date_key'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_assignment_date_key UNIQUE (assignment_id, date);
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_assignments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

SELECT s.id, s.name, s.point_id, s.shift
FROM public.staff s
LEFT JOIN public.shifts sh ON LOWER(TRIM(sh.name::text)) = LOWER(TRIM(s.shift::text))
WHERE s.point_id IS NOT NULL
  AND s.shift IS NOT NULL
  AND sh.id IS NULL;
