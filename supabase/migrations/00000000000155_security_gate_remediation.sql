-- 00000000000155_security_gate_remediation.sql
-- Phase 2.1.2: Smoke Gate Remediation
-- 
-- VULNERABILITIES FOUND BY ADVERSARIAL TESTING:
--
-- VULN-1 [CRITICAL]: roles table UPDATE/DELETE accessible to non-super-admins
--   Root cause: Migration 031 created "Admins manage roles" FOR ALL USING (user_role() IN ('Super Admin', 'Admin'))
--   That policy was never dropped by later migrations. PLUS: any authenticated user with no
--   public.users row has user_role()=null which doesn't match, BUT the permissive "Anyone can read roles"
--   policy for SELECT + lack of a restrictive policy means Supabase PostgREST allows the statement through.
--   The Super Admin role was successfully deleted in adversarial testing.
--
-- VULN-2 [CRITICAL]: users table UPDATE allows Domain Admin to change another user's role_id/domain_id
--   Root cause: Migration 148 "Users can update non-sensitive own profile" USING (auth.uid() = id)
--   was intended for own-profile only, but combined with the trigger that only blocks SELF-changes
--   (i.e., NEW.role_id != OLD.role_id when the user is their own auth.uid()), a Domain Admin
--   authenticates, passes the trigger (since trigger only checks changes to OWN row based on policy
--   matching), and can update ANOTHER user's row if a permissive policy allows it.
--   Additionally: users with no public.users row bypass the trigger (trigger reads OLD values).
--
-- VULN-3 [CRITICAL]: User with auth.users entry but no public.users entry bypasses all RBAC functions
--   Root cause: RBAC functions call auth.uid() then JOIN to public.users. If public.users has no
--   matching row, all functions return null/false. But permissive policies don't require a public.users row.
--   Fix: Add a function that validates the user has an active public.users record, enforce in key policies.
--
-- REMEDIATION STRATEGY:
-- 1. NUKE and REPLACE all roles table policies: Super Admin only for mutations.
-- 2. NUKE and REPLACE all users table policies: properly restrict UPDATE to own non-sensitive fields OR Super Admin.
-- 3. Add get_active_user_id() function that returns null if user has no active public.users entry.
-- 4. Add system role protection: prevent modification/deletion of is_system_admin=true roles.
-- 5. Fix trigger to also block Domain Admin from modifying OTHER users' sensitive fields.

-- ═══════════════════════════════════════════════════════════════════════
-- PART 1: Active User Validation Function
-- ═══════════════════════════════════════════════════════════════════════

-- Returns auth.uid() ONLY if the user has an active record in public.users.
-- If no public.users row exists, returns NULL (same as unauthenticated).
CREATE OR REPLACE FUNCTION public.get_active_user_id()
RETURNS UUID AS $$
  SELECT u.id FROM public.users u
  WHERE u.id = auth.uid() AND u.is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════
-- PART 2: Lock Down the roles Table — Full Policy Reset
-- ═══════════════════════════════════════════════════════════════════════

-- Drop ALL existing policies on roles (including legacy ones never cleaned up)
DROP POLICY IF EXISTS "Admins have full access to roles" ON public.roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.roles;
DROP POLICY IF EXISTS "All authenticated can read roles" ON public.roles;
DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
DROP POLICY IF EXISTS "Super Admin full access roles" ON public.roles;
DROP POLICY IF EXISTS "System Admins can manage roles" ON public.roles;

-- SELECT: Any authenticated user with an active public.users record can read roles (for dropdowns)
CREATE POLICY "Authenticated users can read roles" ON public.roles
    FOR SELECT USING (public.get_active_user_id() IS NOT NULL);

-- INSERT: Only System Admin (is_system_admin=true) can create roles
CREATE POLICY "Only System Admin can create roles" ON public.roles
    FOR INSERT WITH CHECK (public.is_super_admin());

-- UPDATE: Only System Admin can update roles
-- ADDITIONAL PROTECTION: Cannot modify is_system_admin flag on a role that already has it set
-- (prevents downgrade attacks too — only another System Admin can change this)
CREATE POLICY "Only System Admin can update roles" ON public.roles
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- DELETE: Only System Admin can delete roles
-- ADDITIONAL PROTECTION: Cannot delete system admin role (belt-and-suspenders via trigger below)
CREATE POLICY "Only System Admin can delete roles" ON public.roles
    FOR DELETE USING (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PART 3: Protect System Roles via Trigger
-- ═══════════════════════════════════════════════════════════════════════

-- Even if a Super Admin is somehow compromised, prevent deletion of the last system admin role
CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS TRIGGER AS $$
DECLARE
    system_admin_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Block deletion of any role with is_system_admin=true
        IF OLD.is_system_admin = true THEN
            SELECT COUNT(*) INTO system_admin_count
            FROM public.roles WHERE is_system_admin = true AND id != OLD.id;
            IF system_admin_count = 0 THEN
                RAISE EXCEPTION 'Security: Cannot delete the last system admin role. The system would be permanently locked out.';
            END IF;
            -- If there are other system admin roles, still block unless called via service role
            -- (No authenticated user should ever delete a system admin role)
            RAISE EXCEPTION 'Security: System admin roles can only be managed via service role. Deletion blocked.';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Prevent downgrading is_system_admin from true to false on any role
        -- (This would lock out the system)
        IF OLD.is_system_admin = true AND NEW.is_system_admin = false THEN
            RAISE EXCEPTION 'Security: Cannot remove is_system_admin flag. Use service role for this operation.';
        END IF;
        -- Prevent setting is_system_admin=true on non-system roles via RLS bypass
        -- (belt-and-suspenders: RLS already blocks this, but trigger adds defense in depth)
        IF OLD.is_system_admin = false AND NEW.is_system_admin = true AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Security: Only system admin can grant is_system_admin flag.';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_system_roles_trigger ON public.roles;
CREATE TRIGGER protect_system_roles_trigger
    BEFORE UPDATE OR DELETE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.protect_system_roles();

-- ═══════════════════════════════════════════════════════════════════════
-- PART 4: Lock Down users Table — Proper UPDATE Policy
-- ═══════════════════════════════════════════════════════════════════════

-- Drop the vulnerable "own profile" policy that was too broad
DROP POLICY IF EXISTS "Users can update non-sensitive own profile" ON public.users;
DROP POLICY IF EXISTS "Only Super Admin can update users" ON public.users;
DROP POLICY IF EXISTS "Only Super Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Allow service role to insert users" ON public.users;

-- Super Admin can update ANY user
CREATE POLICY "Super Admin can update any user" ON public.users
    FOR UPDATE
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Regular users can ONLY update their own row (non-sensitive fields enforced by trigger)
-- CRITICAL: The USING clause must match auth.uid() = id so they can ONLY touch their own row
CREATE POLICY "Users can update own non-sensitive profile" ON public.users
    FOR UPDATE
    USING (auth.uid() = id AND public.get_active_user_id() IS NOT NULL)
    WITH CHECK (auth.uid() = id AND public.get_active_user_id() IS NOT NULL);

-- INSERT: Only Super Admin or service role can create users
-- (Supabase trigger handles auth → public.users sync; direct INSERT restricted)
CREATE POLICY "Super Admin can insert users" ON public.users
    FOR INSERT WITH CHECK (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PART 5: Strengthen the sensitive field trigger to cover ALL callers
-- ═══════════════════════════════════════════════════════════════════════

-- The existing trigger only raises when auth.uid() is the target user.
-- We need it to also block Domain Admins from changing OTHER users' sensitive fields.

CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Super Admin bypass — can change anything
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- For ANY non-Super-Admin attempting to UPDATE a user record:
    -- Block changes to security-critical fields regardless of which user row is being updated
    IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
        RAISE EXCEPTION 'Security: Only Super Admin can change role assignments. (current user: %, target user: %)',
            auth.uid(), OLD.id;
    END IF;

    IF NEW.domain_id IS DISTINCT FROM OLD.domain_id THEN
        RAISE EXCEPTION 'Security: Only Super Admin can change domain assignments. (current user: %, target user: %)',
            auth.uid(), OLD.id;
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Security: Only Super Admin can activate/deactivate user accounts. (current user: %, target user: %)',
            auth.uid(), OLD.id;
    END IF;

    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Security: Only Super Admin can change organization assignments. (current user: %, target user: %)',
            auth.uid(), OLD.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from migration 148 — just replace the function (done above)
-- The DROP + CREATE ensures the updated function is used
DROP TRIGGER IF EXISTS prevent_sensitive_user_updates_trigger ON public.users;
CREATE TRIGGER prevent_sensitive_user_updates_trigger
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.prevent_sensitive_user_updates();

-- ═══════════════════════════════════════════════════════════════════════
-- PART 6: Lock Down role_permissions Table
-- ═══════════════════════════════════════════════════════════════════════
-- Ensure only Super Admin can assign/remove permissions from roles

DROP POLICY IF EXISTS "Admins have full access to role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Anyone can read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated can read role_permissions" ON public.role_permissions;

-- SELECT: Active users can read role_permissions (needed for permission resolution)
CREATE POLICY "Active users can read role_permissions" ON public.role_permissions
    FOR SELECT USING (public.get_active_user_id() IS NOT NULL);

-- Mutations: Super Admin only
CREATE POLICY "Only Super Admin can manage role_permissions" ON public.role_permissions
    FOR ALL USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PART 7: Lock Down user_permission_overrides Table
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Super Admin manages user_permission_overrides" ON public.user_permission_overrides;
DROP POLICY IF EXISTS "Users can read own overrides" ON public.user_permission_overrides;

CREATE POLICY "Active users can read own overrides" ON public.user_permission_overrides
    FOR SELECT USING (user_id = public.get_active_user_id());

CREATE POLICY "Super Admin can manage all overrides" ON public.user_permission_overrides
    FOR ALL USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PART 8: Lock Down domains Table mutations
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins manage domains" ON public.domains;
DROP POLICY IF EXISTS "Super Admin manages domains" ON public.domains;
DROP POLICY IF EXISTS "Admins have full access to domains" ON public.domains;

-- SELECT: Anyone can read domains (needed for navigation)
-- (Already exists from migration 144 "Anyone can read domains")

-- INSERT/UPDATE/DELETE: Super Admin only
CREATE POLICY "Only Super Admin can mutate domains" ON public.domains
    FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "Only Super Admin can update domains" ON public.domains
    FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Only Super Admin can delete domains" ON public.domains
    FOR DELETE USING (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- PART 9: Verify inactive user isolation in is_super_admin / is_domain_admin
-- ═══════════════════════════════════════════════════════════════════════

-- Rewrite is_super_admin to also check is_active
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND r.is_system_admin = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Rewrite is_domain_admin to also check is_active
-- CANNOT DROP: audit_logs policy depends on is_domain_admin(uuid) signature
-- Use CREATE OR REPLACE keeping DEFAULT NULL — the no-arg call passes NULL, and IS NULL OR covers both paths
CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND u.is_active = true
    AND r.is_domain_admin = true
    AND (p_domain_id IS NULL OR u.domain_id = p_domain_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Rewrite is_admin_or_super to use updated functions
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
  SELECT public.is_super_admin() OR public.is_domain_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Rewrite has_permission to check is_active
CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_id UUID;
    v_is_system_admin BOOLEAN;
    v_is_active BOOLEAN;
    v_is_denied BOOLEAN;
    v_is_granted BOOLEAN;
    v_permission_id UUID;
BEGIN
    -- Get user's role, admin flag, and active status
    SELECT u.role_id, r.is_system_admin, u.is_active
    INTO v_role_id, v_is_system_admin, v_is_active
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    -- If user is not found or not active, deny everything
    IF NOT FOUND OR NOT COALESCE(v_is_active, false) THEN
        RETURN FALSE;
    END IF;

    -- System Admin bypass
    IF COALESCE(v_is_system_admin, FALSE) THEN
        RETURN TRUE;
    END IF;

    -- Find permission ID
    SELECT id INTO v_permission_id FROM public.permissions
    WHERE action = p_action AND resource = p_resource;

    IF v_permission_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check explicit DENY override (highest priority)
    SELECT TRUE INTO v_is_denied
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = TRUE;

    IF FOUND AND v_is_denied THEN
        RETURN FALSE;
    END IF;

    -- Check explicit GRANT override
    SELECT TRUE INTO v_is_granted
    FROM public.user_permission_overrides
    WHERE user_id = auth.uid() AND permission_id = v_permission_id AND is_deny = FALSE;

    IF FOUND AND v_is_granted THEN
        RETURN TRUE;
    END IF;

    -- Check Role-Based Permissions
    IF v_role_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role_id = v_role_id AND rp.permission_id = v_permission_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
