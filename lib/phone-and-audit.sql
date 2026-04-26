-- Fix users role constraint to allow 'staff' role
SET search_path TO public;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'field_officer', 'staff'));

-- Add phone column to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);

NOTIFY pgrst, 'reload schema';
