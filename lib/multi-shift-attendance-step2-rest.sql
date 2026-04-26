-- =============================================================================
-- STEP 2 — run ONLY after Step 1 succeeded and
--   SELECT to_regclass('public.staff_assignments');
-- returns staff_assignments.
-- =============================================================================

SET search_path TO public;

-- Extend attendance; depends on public.staff_assignments existing
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.staff_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marked_by_role VARCHAR(20);

-- Backfill one assignment per existing staff member when point + shift can be matched
INSERT INTO public.staff_assignments (staff_id, point_id, shift_id, active)
SELECT s.id, s.point_id, sh.id, TRUE
FROM public.staff s
JOIN public.shifts sh ON LOWER(TRIM(sh.name)) = LOWER(TRIM(s.shift::text))
WHERE s.point_id IS NOT NULL
  AND s.shift IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = s.id
      AND sa.point_id = s.point_id
      AND sa.shift_id = sh.id
  );

-- Link historical attendance
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

-- Drop legacy one-row-per-staff-per-day (Postgres default name for UNIQUE(staff_id, date))
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_staff_id_date_key;

-- One row per (assignment, date)
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

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_assignments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Orphaned shift names (fix shifts / staff.shift then re-run step 1 INSERT if needed)
SELECT s.id, s.name, s.point_id, s.shift
FROM public.staff s
LEFT JOIN public.shifts sh ON LOWER(TRIM(sh.name::text)) = LOWER(TRIM(s.shift::text))
WHERE s.point_id IS NOT NULL
  AND s.shift IS NOT NULL
  AND sh.id IS NULL;
