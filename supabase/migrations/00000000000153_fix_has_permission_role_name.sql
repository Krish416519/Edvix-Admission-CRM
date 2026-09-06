-- 00000000000153_fix_has_permission_role_name.sql
-- Phase 2.1.1: Final elimination of role name strings from core authorization functions
-- Migration 151 defined has_permission() and get_user_permissions() still using 
-- `v_role_name = 'Super Admin'` as a bypass check. This migration replaces that with
-- the explicit `roles.is_system_admin` boolean flag established in Migration 152.
-- This is the final security gate: after this migration, NO security function uses role names.

-- 1. Rewrite has_permission() to use is_system_admin boolean flag
CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_id UUID;
    v_is_system_admin BOOLEAN;
    v_is_denied BOOLEAN;
    v_is_granted BOOLEAN;
    v_permission_id UUID;
BEGIN
    -- Get user role_id and system admin flag from DB
    -- DO NOT use role name as a security boundary
    SELECT u.role_id, r.is_system_admin
    INTO v_role_id, v_is_system_admin
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    -- System Admin bypass: uses explicit boolean flag, NOT role name string
    IF COALESCE(v_is_system_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- Find the permission ID being queried
    SELECT id INTO v_permission_id FROM public.permissions 
    WHERE action = p_action AND resource = p_resource;

    -- If permission doesn't exist in system, deny
    IF v_permission_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Check for explicit DENY override (highest priority)
    SELECT TRUE INTO v_is_denied
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = TRUE;

    IF FOUND AND v_is_denied THEN
        RETURN FALSE;
    END IF;

    -- 2. Check for explicit GRANT override
    SELECT TRUE INTO v_is_granted
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = FALSE;

    IF FOUND AND v_is_granted THEN
        RETURN TRUE;
    END IF;

    -- 3. Check Role-Based Permissions
    IF v_role_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_permission_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Rewrite get_user_permissions() to use is_system_admin boolean flag
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (action VARCHAR, resource VARCHAR) AS $$
DECLARE
    v_role_id UUID;
    v_is_system_admin BOOLEAN;
BEGIN
    -- Get user role_id and system admin flag from DB
    -- DO NOT use role name as a security boundary
    SELECT u.role_id, r.is_system_admin
    INTO v_role_id, v_is_system_admin
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;

    -- System Admin gets all permissions — uses explicit boolean flag, NOT role name string
    IF COALESCE(v_is_system_admin, FALSE) THEN
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

-- 3. Rewrite rbac_audit_logs RLS to use is_system_admin flag instead of is_super_admin() string
-- (is_super_admin() was updated in 152 to use the flag already, this is belt-and-suspenders)
DROP POLICY IF EXISTS "Super Admins can view RBAC audit logs" ON public.rbac_audit_logs;
CREATE POLICY "System Admins can view RBAC audit logs" ON public.rbac_audit_logs
    FOR SELECT USING (public.is_super_admin());

-- 4. Verification: Ensure the ILIKE seeding from migration 152 only ran once at migration time.
-- The is_system_admin / is_domain_admin flags are now persistent in the DB and NOT recalculated
-- from role names at runtime. Role renames DO NOT affect security boundaries.
-- To change a role's admin status, a Super Admin must explicitly UPDATE the roles table.
