-- 00000000000147_rbac_fk_historical_preservation.sql
-- Phase 1.6: Zero-Trust Authorization & Data-Integrity Certification
-- Resolves Historical FK Cascades and Actor Spoofing

BEGIN;

-- ==============================================================================
-- 1. FIX: PREVENT ACTOR SPOOFING IN AUDIT LOGS
-- ==============================================================================
-- The previous definition allowed an authenticated caller to pass any `p_actor_id`.
-- We override `p_actor_id` with `auth.uid()` if the caller is authenticated via JWT.
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
    -- SECURITY FIX: Enforce auth.uid() over parameter if called by authenticated user
    IF auth.uid() IS NOT NULL THEN
        p_actor_id := auth.uid();
    END IF;

    IF p_actor_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch actor snapshots
    SELECT u.name, u.email, r.name, u.domain_id 
    INTO v_actor_name, v_actor_email, v_actor_role, v_domain_id
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_actor_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 2. FIX: PREVENT CASCADE DELETION OF HISTORICAL RECORDS
-- ==============================================================================
-- These foreign keys currently use ON DELETE CASCADE. If a user is hard-deleted 
-- from auth.users (which cascades to public.users), these historical records 
-- would be destroyed. We update them to SET NULL to preserve the business data.

-- A. Lead Assignments
ALTER TABLE public.lead_assignments DROP CONSTRAINT IF EXISTS lead_assignments_assignee_id_fkey;
ALTER TABLE public.lead_assignments ADD CONSTRAINT lead_assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- B. BI Saved Reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bi_saved_reports') THEN
    ALTER TABLE public.bi_saved_reports DROP CONSTRAINT IF EXISTS bi_saved_reports_created_by_fkey;
    ALTER TABLE public.bi_saved_reports ADD CONSTRAINT bi_saved_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bi_scheduled_reports') THEN
    ALTER TABLE public.bi_scheduled_reports DROP CONSTRAINT IF EXISTS bi_scheduled_reports_created_by_fkey;
    ALTER TABLE public.bi_scheduled_reports ADD CONSTRAINT bi_scheduled_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;


COMMIT;
