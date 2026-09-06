-- 00000000000152_drop_role_name_authorization.sql
-- Phase 2.1.1: Complete elimination of hardcoded role names and domain strings from security policies

-- 1. Add explicit security metadata to roles table
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_domain_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Seed existing roles with appropriate metadata
UPDATE public.roles SET is_system_admin = true WHERE name = 'Super Admin';
UPDATE public.roles SET is_domain_admin = true WHERE name ILIKE '%Admin' AND name != 'Super Admin';

-- 3. Redefine is_super_admin to use the boolean flag
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
DECLARE
    v_is_system_admin BOOLEAN;
BEGIN
    SELECT r.is_system_admin INTO v_is_system_admin
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    RETURN COALESCE(v_is_system_admin, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Redefine is_domain_admin to use the boolean flag (No more ILIKE '%Admin%')
CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_id UUID DEFAULT NULL) RETURNS BOOLEAN AS $$
DECLARE
    v_user_domain_id UUID;
    v_is_domain_admin BOOLEAN;
BEGIN
    SELECT u.domain_id, r.is_domain_admin
    INTO v_user_domain_id, v_is_domain_admin
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    IF NOT COALESCE(v_is_domain_admin, FALSE) THEN
        RETURN FALSE;
    END IF;

    IF p_domain_id IS NOT NULL THEN
        RETURN v_user_domain_id = p_domain_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- We cannot DROP is_admin(), is_admin_or_super(), or is_domain_admin(VARCHAR) until we replace all policies relying on them.
-- Instead, we redefine them to use the dynamic has_permission or is_super_admin fallback.

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    -- Fallback to is_super_admin() or a generic admin check. 
    -- We map legacy is_admin() calls to either Super Admin or Domain Admin.
    RETURN public.is_super_admin() OR public.is_domain_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super() RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_super_admin() OR public.is_domain_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_name VARCHAR) RETURNS BOOLEAN AS $$
DECLARE
    v_domain_id UUID;
BEGIN
    SELECT id INTO v_domain_id FROM public.domains WHERE slug = lower(p_domain_name) OR name = p_domain_name;
    RETURN public.is_domain_admin(v_domain_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Now we must FIX the hardcoded strings in leads policies (from 146 & 144)
-- The legacy leads policy used get_user_role_name() IN ('Admission Manager', ...)
-- We will DROP and recreate the leads policies to strictly use RBAC permissions.

DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable Create Leads" ON public.leads;
    DROP POLICY IF EXISTS "Enable Read Leads" ON public.leads;
    DROP POLICY IF EXISTS "Enable Update Leads" ON public.leads;
    
    DROP POLICY IF EXISTS "Enable Select Tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Enable Update Tasks" ON public.tasks;
    
    DROP POLICY IF EXISTS "Domain Admins can view domain audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Super Admins can view all audit logs" ON public.audit_logs;
END $$;

-- Recreate policies securely without strings
CREATE POLICY "Enable Create Leads" ON public.leads FOR INSERT 
WITH CHECK (
    public.is_super_admin() OR 
    public.has_permission('Edit Leads', 'Lead Management')
);

CREATE POLICY "Enable Read Leads" ON public.leads FOR SELECT 
USING (
    public.is_super_admin() OR 
    assigned_counselor = auth.uid() OR 
    public.is_manager_of(assigned_counselor) OR
    public.has_permission('View All Leads', 'Lead Management')
);

CREATE POLICY "Enable Update Leads" ON public.leads FOR UPDATE 
USING (
    public.is_super_admin() OR 
    assigned_counselor = auth.uid() OR 
    public.is_manager_of(assigned_counselor) OR
    public.has_permission('Edit Leads', 'Lead Management')
);

CREATE POLICY "Enable Select Tasks" ON public.tasks FOR SELECT 
USING (
    public.is_super_admin() OR 
    assigned_user = auth.uid() OR 
    created_by = auth.uid() OR
    public.is_manager_of(assigned_user) OR
    public.has_permission('View All Leads', 'Lead Management')
);

CREATE POLICY "Enable Update Tasks" ON public.tasks FOR UPDATE 
USING (
    public.is_super_admin() OR 
    assigned_user = auth.uid() OR 
    created_by = auth.uid() OR
    public.is_manager_of(assigned_user) OR
    public.has_permission('Edit Leads', 'Lead Management')
);

CREATE POLICY "Domain Admins can view domain audit logs" ON public.audit_logs FOR SELECT 
USING (
    public.is_domain_admin() AND 
    domain_id = (SELECT domain_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Super Admins can view all audit logs" ON public.audit_logs FOR SELECT 
USING (public.is_super_admin());

-- Redefine get_user_role_name to simply return the role name without it being a security boundary
CREATE OR REPLACE FUNCTION public.get_user_role_name(p_user_id UUID) RETURNS VARCHAR AS $$
DECLARE
    v_role_name VARCHAR;
BEGIN
    SELECT r.name INTO v_role_name 
    FROM public.users u 
    LEFT JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = p_user_id;
    
    RETURN COALESCE(v_role_name, 'Unknown');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
