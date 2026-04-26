-- =============================================================================
-- Point Rate Slots — billing plan per point keyed by designation
--
-- Stores e.g. "Madras Cafe = 2 Supervisors @ 15,000 + 1 Gunman @ 10,000".
-- Total rate is computed from rows; the legacy `points.rate` column remains
-- available for any backwards-compatible reads, but is no longer written by
-- the API.
--
-- Run this WHOLE FILE in the Supabase SQL Editor. Safe to re-run.
-- =============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.point_rate_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id        UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  designation     VARCHAR(100) NOT NULL,
  count           INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
  rate_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (rate_per_person >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT point_rate_slots_point_designation_key UNIQUE (point_id, designation)
);

CREATE INDEX IF NOT EXISTS idx_point_rate_slots_point ON public.point_rate_slots(point_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.point_rate_slots;
EXCEPTION
  WHEN duplicate_object  THEN NULL;
  WHEN undefined_object  THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT
  to_regclass('public.point_rate_slots') AS table_created,
  (SELECT COUNT(*) FROM public.point_rate_slots) AS row_count;
