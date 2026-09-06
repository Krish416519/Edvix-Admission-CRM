-- 00000000000142_immutable_audit_logs.sql
-- Phase 11: Historical Actor Snapshots & Phase 12: Immutable Audit Trail

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_name_snapshot VARCHAR(255) NOT NULL,
    actor_email_snapshot VARCHAR(255) NOT NULL,
    actor_role_snapshot VARCHAR(255) NOT NULL,
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_domain ON public.audit_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Append-only RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Normal users CANNOT select, insert, update or delete by default.
-- Only Super Admin or authorized roles can read. Nobody can update/delete.

CREATE POLICY "Super Admins can view all audit logs" 
ON public.audit_logs FOR SELECT 
USING (
    public.get_user_role_name(auth.uid()) = 'Super Admin'
);

CREATE POLICY "Domain Admins can view domain audit logs" 
ON public.audit_logs FOR SELECT 
USING (
    public.get_user_role_name(auth.uid()) IN ('Admission Admin', 'HR Admin', 'Finance Admin')
    AND domain_id = (SELECT domain_id FROM public.users WHERE id = auth.uid())
);

-- Inserts are handled ONLY by security definer trigger functions or secured RPCs.
-- Thus, no INSERT policy for normal clients.

-- Generic function to easily insert audit logs safely
CREATE OR REPLACE FUNCTION public.insert_audit_log(
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_actor_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    v_actor_name VARCHAR;
    v_actor_email VARCHAR;
    v_actor_role VARCHAR;
    v_domain_id UUID;
    v_log_id UUID;
BEGIN
    -- Only run if there is an authenticated user context (or a passed system user)
    IF p_actor_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch actor snapshots
    SELECT u.name, u.email, r.name, u.domain_id 
    INTO v_actor_name, v_actor_email, v_actor_role, v_domain_id
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_actor_id;

    -- Handle system actions where actor might not be found in standard way
    IF v_actor_name IS NULL THEN
        v_actor_name := 'System/Unknown';
        v_actor_email := 'system@edvix.com';
        v_actor_role := 'System';
    END IF;

    INSERT INTO public.audit_logs (
        actor_id, actor_name_snapshot, actor_email_snapshot, actor_role_snapshot, 
        domain_id, action, entity_type, entity_id, old_values, new_values, metadata
    )
    VALUES (
        p_actor_id, v_actor_name, v_actor_email, v_actor_role,
        v_domain_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
