-- 00000000000148_fix_privilege_escalation.sql

-- 1. Drop all legacy permissive update policies on users
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update own last_login" ON public.users;

-- 2. Restrict Users updating their own profile
-- Users should ONLY be able to update non-security fields like first_name, last_name, phone
-- Unfortunately, Supabase standard RLS doesn't do column-level policies nicely.
-- Instead, we will rely on a trigger to prevent sensitive column updates, or we can just block direct updates to role_id.
-- We will implement a trigger that throws an error if a non-super-admin tries to change role_id, domain_id, or is_active.

CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Super admins bypass this check
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Block changes to sensitive fields for non-super-admins
    IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
        RAISE EXCEPTION 'Privilege Escalation: You cannot change your own role.';
    END IF;

    IF NEW.domain_id IS DISTINCT FROM OLD.domain_id THEN
        RAISE EXCEPTION 'Privilege Escalation: You cannot change your own domain.';
    END IF;
    
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Privilege Escalation: You cannot activate/deactivate accounts.';
    END IF;

    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'Privilege Escalation: You cannot change your organization.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_sensitive_user_updates_trigger ON public.users;
CREATE TRIGGER prevent_sensitive_user_updates_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sensitive_user_updates();

-- Re-enable the safe 'own profile' update so users can still change their name/phone
CREATE POLICY "Users can update non-sensitive own profile" ON public.users 
FOR UPDATE USING (auth.uid() = id);

-- Note: "Only Super Admin can update users" (from 144) still allows Super Admin to update ANY user.
