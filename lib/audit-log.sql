CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- 'staff', 'point', 'area', 'field_officer', 'attendance', 'shift', 'designation', 'user'
  entity_id VARCHAR(255),
  entity_name VARCHAR(255),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
