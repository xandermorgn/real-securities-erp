-- =============================================================================
-- BULLETPROOF FIX for: "Could not find the table 'public.staff_assignments'
--                       in the schema cache"
--
-- Run this WHOLE FILE in the Supabase SQL Editor. From the very first line
-- to the very last. Do not select only part of it.
-- =============================================================================

-- 0) Make sure we are in the public schema --------------------------------
SET search_path TO public;

-- 1) Verify the parent tables exist (will RAISE if any are missing) -------
DO $$
DECLARE
  missing text := '';
BEGIN
  IF to_regclass('public.staff')  IS NULL THEN missing := missing || 'staff ';  END IF;
  IF to_regclass('public.points') IS NULL THEN missing := missing || 'points '; END IF;
  IF to_regclass('public.shifts') IS NULL THEN missing := missing || 'shifts '; END IF;
  IF to_regclass('public.attendance') IS NULL THEN missing := missing || 'attendance '; END IF;

  IF length(missing) > 0 THEN
    RAISE EXCEPTION 'Required base tables missing: % — run lib/database-schema.sql first', missing;
  END IF;

  RAISE NOTICE '✓ Base tables present';
END $$;

-- 2) Create the staff_assignments table -----------------------------------
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES public.staff(id)  ON DELETE CASCADE,
  point_id    UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  shift_id    UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_assignments_staff_point_shift_key
    UNIQUE (staff_id, point_id, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff  ON public.staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_point  ON public.staff_assignments(point_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_shift  ON public.staff_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_active ON public.staff_assignments(active);

DO $$
BEGIN
  IF to_regclass('public.staff_assignments') IS NULL THEN
    RAISE EXCEPTION 'CREATE TABLE staff_assignments failed silently — abort.';
  END IF;
  RAISE NOTICE '✓ staff_assignments table exists';
END $$;

-- 3) Add the new attendance columns ---------------------------------------
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS assignment_id   UUID REFERENCES public.staff_assignments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS marked_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marked_by_role  VARCHAR(20);

-- 4) Backfill assignments for existing staff (best-effort name match) -----
INSERT INTO public.staff_assignments (staff_id, point_id, shift_id, active)
SELECT s.id, s.point_id, sh.id, TRUE
FROM public.staff s
JOIN public.shifts sh
  ON LOWER(TRIM(sh.name::text)) = LOWER(TRIM(s.shift::text))
WHERE s.point_id IS NOT NULL
  AND s.shift   IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = s.id
      AND sa.point_id = s.point_id
      AND sa.shift_id = sh.id
  );

-- 5) Backfill assignment_id on historical attendance rows -----------------
UPDATE public.attendance a
SET    assignment_id  = sa.id,
       marked_at      = COALESCE(a.marked_at, a.updated_at, a.created_at),
       marked_by_role = COALESCE(a.marked_by_role, 'admin')
FROM   public.staff_assignments sa
JOIN   public.shifts sh ON sh.id = sa.shift_id
WHERE  a.assignment_id IS NULL
  AND  a.staff_id  = sa.staff_id
  AND  a.point_id  = sa.point_id
  AND  (a.shift IS NULL OR LOWER(TRIM(a.shift::text)) = LOWER(TRIM(sh.name::text)));

-- 6) Swap the uniqueness rule ---------------------------------------------
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_staff_id_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_assignment_date_key'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_assignment_date_key UNIQUE (assignment_id, date);
  END IF;
END $$;

-- 7) Add to realtime publication ------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_assignments;
EXCEPTION
  WHEN duplicate_object  THEN NULL;
  WHEN undefined_object  THEN NULL;
END $$;

-- 8) FORCE PostgREST to reload its schema cache (THE actual fix for your error)
NOTIFY pgrst, 'reload schema';

-- 9) Final proof ----------------------------------------------------------
SELECT
  to_regclass('public.staff_assignments')                                   AS table_exists,
  (SELECT COUNT(*) FROM public.staff_assignments)                           AS row_count,
  (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='attendance'
       AND column_name='assignment_id')                                     AS attendance_has_assignment_id;
