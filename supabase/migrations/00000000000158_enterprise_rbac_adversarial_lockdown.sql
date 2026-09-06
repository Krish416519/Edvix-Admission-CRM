-- ====================================================================
-- MIGRATION 158: ENTERPRISE RBAC ADVERSARIAL SECURITY LOCKDOWN
-- Fixes RLS vulnerabilities on access_profiles, syncs has_permission(),
-- enforces privilege escalation prevention, and closes manager/team scope loopholes.
-- ====================================================================

-- 1. Lock Down access_profiles Table RLS
DROP POLICY IF EXISTS "Super Admins can manage access profiles" ON public.access_profiles;
DROP POLICY IF EXISTS "Users can read access profiles" ON public.access_profiles;
DROP POLICY IF EXISTS "Super Admin can manage access profiles" ON public.access_profiles;
DROP POLICY IF EXISTS "Authenticated users can read access profiles" ON public.access_profiles;

ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated staff can view access profiles
CREATE POLICY "Authenticated users can read access profiles" ON public.access_profiles
    FOR SELECT TO authenticated
    USING (true);

-- Mutation policy: Strictly Super Admin or platform admin
CREATE POLICY "Super Admins can manage access profiles" ON public.access_profiles
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 2. Lock Down access_profile_permissions Table RLS
DROP POLICY IF EXISTS "Super Admins can manage profile permissions" ON public.access_profile_permissions;
DROP POLICY IF EXISTS "Users can read profile permissions" ON public.access_profile_permissions;
DROP POLICY IF EXISTS "Super Admin can manage profile permissions" ON public.access_profile_permissions;
DROP POLICY IF EXISTS "Authenticated users can read profile permissions" ON public.access_profile_permissions;

ALTER TABLE public.access_profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile permissions" ON public.access_profile_permissions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Super Admins can manage profile permissions" ON public.access_profile_permissions
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 3. Update is_super_admin() Function to recognize both canonical access_profile and legacy fallback
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND (
            u.is_platform_super_admin = true
            OR (u.access_profile_id IS NOT NULL AND ap.name = 'Super Admin')
            OR (u.access_profile_id IS NULL AND r.name = 'Super Admin')
        )
    );
$$;

-- 4. Update has_permission() to enforce Canonical Access Profile Precedence
CREATE OR REPLACE FUNCTION public.has_permission(p_action text, p_resource text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_access_profile_id UUID;
    v_role_id UUID;
    v_override_deny BOOLEAN;
    v_override_allow BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Super Admin always bypasses all checks
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Step 1: Check User Permission Overrides (Explicit DENY wins immediately)
    SELECT 
        bool_or(is_deny = true),
        bool_or(is_deny = false)
    INTO v_override_deny, v_override_allow
    FROM public.user_permission_overrides upo
    JOIN public.permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = v_user_id
      AND p.action = p_action
      AND p.resource = p_resource;

    IF v_override_deny = true THEN
        RETURN FALSE;
    END IF;

    IF v_override_allow = true THEN
        RETURN TRUE;
    END IF;

    -- Step 2: Retrieve User's Access Profile ID and Role ID
    SELECT access_profile_id, role_id
    INTO v_access_profile_id, v_role_id
    FROM public.users
    WHERE id = v_user_id;

    -- Step 3: Canonical Security Authority (Access Profile Permissions)
    IF v_access_profile_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.access_profile_permissions app
            JOIN public.permissions p ON app.permission_id = p.id
            WHERE app.access_profile_id = v_access_profile_id
              AND p.action = p_action
              AND p.resource = p_resource
        );
    END IF;

    -- Step 4: Fallback to Role Permissions ONLY for unmigrated legacy users
    IF v_role_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.role_permissions rp
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = v_role_id
              AND p.action = p_action
              AND p.resource = p_resource
        );
    END IF;

    RETURN FALSE;
END;
$$;

-- Overload for varchar arguments for backwards compatibility
CREATE OR REPLACE FUNCTION public.has_permission(p_action character varying, p_resource character varying)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.has_permission(p_action::text, p_resource::text);
$$;

-- 5. Update is_manager_of() to check relational team_id and reporting manager
CREATE OR REPLACE FUNCTION public.is_manager_of(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users target
        WHERE target.id = p_user_id
        AND (
            -- Direct reporting manager
            target.manager_id = auth.uid()
            -- Same team leader assignment
            OR (
                target.team_id IS NOT NULL 
                AND target.team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
                AND EXISTS (
                    SELECT 1 FROM public.teams t 
                    WHERE t.id = target.team_id 
                    AND t.team_leader_id = auth.uid()
                )
            )
            -- Department head / Manager oversight
            OR (
                target.department_id IS NOT NULL
                AND target.department_id = (SELECT department_id FROM public.users WHERE id = auth.uid())
                AND EXISTS (
                    SELECT 1 FROM public.users me
                    LEFT JOIN public.access_profiles ap ON me.access_profile_id = ap.id
                    LEFT JOIN public.roles r ON me.role_id = r.id
                    WHERE me.id = auth.uid()
                    AND (
                        ap.data_scope IN ('DEPARTMENT', 'ORGANIZATION')
                        OR r.name LIKE '%Manager'
                        OR r.name LIKE '%Admin'
                    )
                )
            )
        )
    );
$$;

-- 6. Privilege Escalation Prevention Trigger on users table
CREATE OR REPLACE FUNCTION public.check_user_self_update_privilege()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Service role / postgres maintenance has no auth.uid() -> allow
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Super Admin can manage all user assignments -> allow
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Block non-admin modification of any privileged authorization fields:
    IF (
        NEW.role_id IS DISTINCT FROM OLD.role_id OR
        NEW.access_profile_id IS DISTINCT FROM OLD.access_profile_id OR
        NEW.is_platform_super_admin IS DISTINCT FROM OLD.is_platform_super_admin OR
        NEW.department_id IS DISTINCT FROM OLD.department_id OR
        NEW.designation_id IS DISTINCT FROM OLD.designation_id OR
        NEW.team_id IS DISTINCT FROM OLD.team_id OR
        NEW.manager_id IS DISTINCT FROM OLD.manager_id OR
        NEW.is_active IS DISTINCT FROM OLD.is_active
    ) THEN
        RAISE EXCEPTION 'Privilege escalation blocked: Non-admin users cannot alter authorization profiles, roles, hierarchy, or status.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_privilege_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_self_update_privilege();

-- 7. Add performance indexes for RLS evaluation
CREATE INDEX IF NOT EXISTS idx_leads_assigned_counselor ON public.leads(assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_users_access_profile_id ON public.users(access_profile_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);
CREATE INDEX IF NOT EXISTS idx_app_access_profile_id ON public.access_profile_permissions(access_profile_id);
CREATE INDEX IF NOT EXISTS idx_upo_user_id ON public.user_permission_overrides(user_id);

-- 8. Enforce RESTRICTIVE tenant isolation on leads
-- This prevents the permissive tenant policy from overriding data scopes (ASSIGNED/TEAM/DEPARTMENT)
DROP POLICY IF EXISTS tenant_isolation_policy ON public.leads;
CREATE POLICY tenant_isolation_policy ON public.leads
    AS RESTRICTIVE
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

NOTIFY pgrst, 'reload schema';
