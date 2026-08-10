ALTER TABLE public.automation_runs
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
