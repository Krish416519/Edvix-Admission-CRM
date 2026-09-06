-- 00000000000151_dynamic_rbac_foundation.sql
-- Phase 2.1: Dynamic Domains, User Permission Overrides, and RBAC Auditing

-- 1. Seed the missing Marketing Domain
INSERT INTO public.domains (name, slug, description) VALUES
('Marketing', 'marketing', 'Marketing and Outreach Operations')
ON CONFLICT (slug) DO NOTHING;

-- Seed basic Marketing roles (Assuming Super Admin organization)
DO $$
DECLARE
    v_marketing_id UUID;
    v_org_id UUID;
BEGIN
    SELECT id INTO v_marketing_id FROM public.domains WHERE slug = 'marketing';
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

    INSERT INTO public.roles (name, domain_id, organization_id) VALUES
    ('Marketing Admin', v_marketing_id, v_org_id),
    ('Marketing Manager', v_marketing_id, v_org_id),
    ('Marketing Executive', v_marketing_id, v_org_id)
    ON CONFLICT (name) DO NOTHING;
END $$;

-- 2. Create User Permission Overrides table
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_deny BOOLEAN NOT NULL DEFAULT false, -- If true, explicit DENY. If false, explicit GRANT.
    granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission_id) -- A user can only have one override per permission
);

-- Enable RLS on overrides
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admins can manage overrides" ON public.user_permission_overrides
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can view their own overrides" ON public.user_permission_overrides
    FOR SELECT USING (user_id = auth.uid());

-- 3. Create RBAC Audit Logs table
CREATE TABLE IF NOT EXISTS public.rbac_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., DOMAIN_CREATED, USER_PERMISSION_GRANTED
    target_id UUID, -- Generic ID for the affected resource
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE SET NULL,
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit logs (Read only for Super Admins, append-only internally)
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admins can view RBAC audit logs" ON public.rbac_audit_logs
    FOR SELECT USING (public.is_super_admin());

-- 4. Re-define `is_domain_admin` to be fully dynamic
-- Instead of hardcoding 'Admission', we check if the user is a Domain Admin for the given context
CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_id UUID DEFAULT NULL) RETURNS BOOLEAN AS $$
DECLARE
    v_user_domain_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get current user's domain and check if they have an "Admin" role
    SELECT u.domain_id, (r.name LIKE '%Admin')
    INTO v_user_domain_id, v_is_admin
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    -- If not an admin role, return false
    IF NOT v_is_admin THEN
        RETURN FALSE;
    END IF;

    -- If a specific domain is queried, check if it matches the user's domain
    IF p_domain_id IS NOT NULL THEN
        RETURN v_user_domain_id = p_domain_id;
    END IF;

    -- If no domain is queried, they just need to be an admin of their own domain
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Re-define `has_permission` to compute Effective Permissions
CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_id UUID;
    v_role_name VARCHAR;
    v_is_denied BOOLEAN;
    v_is_granted BOOLEAN;
    v_permission_id UUID;
BEGIN
    -- Get user role
    SELECT u.role_id, r.name 
    INTO v_role_id, v_role_name
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    -- Super Admin bypasses all checks
    IF v_role_name = 'Super Admin' THEN
        RETURN TRUE;
    END IF;

    -- Find the permission ID being queried
    SELECT id INTO v_permission_id FROM public.permissions 
    WHERE action = p_action AND resource = p_resource;

    -- If permission doesn't exist, deny
    IF v_permission_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Check for explicit DENY override
    SELECT TRUE INTO v_is_denied
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = TRUE;

    IF v_is_denied THEN
        RETURN FALSE;
    END IF;

    -- 2. Check for explicit GRANT override
    SELECT TRUE INTO v_is_granted
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = FALSE;

    IF v_is_granted THEN
        RETURN TRUE;
    END IF;

    -- 3. Check Role-Based Permissions
    IF EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_permission_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 6. Update `get_user_permissions` to accurately list the user's active permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (action VARCHAR, resource VARCHAR) AS $$
DECLARE
    v_role_id UUID;
    v_role_name VARCHAR;
BEGIN
    -- Get user role
    SELECT u.role_id, r.name 
    INTO v_role_id, v_role_name
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;

    -- If Super Admin, return all
    IF v_role_name = 'Super Admin' THEN
        RETURN QUERY SELECT p.action, p.resource FROM public.permissions p;
        RETURN;
    END IF;

    RETURN QUERY
    -- Base Role Permissions (Exclude any that are explicitly denied)
    SELECT p.action, p.resource 
    FROM public.permissions p
    JOIN public.role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = v_role_id
    AND p.id NOT IN (
        SELECT permission_id FROM public.user_permission_overrides 
        WHERE user_id = p_user_id AND is_deny = TRUE
    )
    UNION
    -- Explicit User Grants
    SELECT p.action, p.resource 
    FROM public.permissions p
    JOIN public.user_permission_overrides upo ON p.id = upo.permission_id
    WHERE upo.user_id = p_user_id AND upo.is_deny = FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
