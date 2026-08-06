-- 00000000000052_ai_audit_logs.sql
-- Migration to create the ai_audit_logs table for the AI Command Center

DROP TABLE IF EXISTS public.ai_audit_logs CASCADE;

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL,
    prompt text NOT NULL,
    action_taken text NOT NULL,
    tools_used text[] DEFAULT '{}'::text[],
    affected_records jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL CHECK (status IN ('success', 'failure')),
    error_message text,
    execution_time_ms integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_id ON public.ai_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON public.ai_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_status ON public.ai_audit_logs(status);

-- RLS
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and Super Admins can see all logs
CREATE POLICY "Super Admins and Admins can view all AI audit logs"
    ON public.ai_audit_logs FOR SELECT TO authenticated
    USING (public.user_role() IN ('Super Admin', 'Admin'));

-- Users can only see their own logs
CREATE POLICY "Users can view their own AI audit logs"
    ON public.ai_audit_logs FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- The system/users can insert their own logs
CREATE POLICY "Users can insert their own AI audit logs"
    ON public.ai_audit_logs FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
