-- 00000000000143_user_lifecycle.sql
-- Phase 15: Foreign Key Safety & Phase 26: Account Deactivation Workflow

-- 1. Ensure foreign keys do not cascade delete historical data
-- (We assume these might already be set, but we enforce it just to be sure)
-- Leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_assigned_counselor_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_assigned_counselor_fkey FOREIGN KEY (assigned_counselor) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Calls
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_counselor_id_fkey;
ALTER TABLE public.calls ADD CONSTRAINT calls_counselor_id_fkey FOREIGN KEY (counselor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Tasks
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_user_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_user_fkey FOREIGN KEY (assigned_user) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create User Deactivation RPC
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_role VARCHAR;
    v_user_exists BOOLEAN;
    v_is_super_admin BOOLEAN;
    v_super_admin_count INT;
BEGIN
    v_actor_role := public.get_user_role_name(auth.uid());
    
    -- Only Super Admin can deactivate users
    IF v_actor_role != 'Super Admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admin can deactivate users.';
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_user_exists;
    IF NOT v_user_exists THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- Prevent lockout: Check if deactivating a Super Admin
    SELECT (r.name = 'Super Admin') INTO v_is_super_admin 
    FROM public.users u 
    LEFT JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = p_user_id;

    IF v_is_super_admin THEN
        SELECT COUNT(*) INTO v_super_admin_count 
        FROM public.users u
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE r.name = 'Super Admin' AND u.is_active = true;

        IF v_super_admin_count <= 1 THEN
            RAISE EXCEPTION 'Cannot deactivate the last active Super Admin.';
        END IF;
    END IF;

    -- Mark user as inactive
    UPDATE public.users SET is_active = false, updated_at = NOW() WHERE id = p_user_id;

    -- Note: Supabase auth.users cannot be easily modified from a standard RPC due to permissions.
    -- The frontend should call a Supabase Edge Function to actually `admin.deleteUser` or `admin.updateUserById({ ban_duration })`
    -- if strict auth blocking is required. Or we rely on RLS/App logic checking `is_active = true`.
    
    -- Log Audit Event
    PERFORM public.insert_audit_log(
        'USER_DEACTIVATED',
        'User',
        p_user_id,
        jsonb_build_object('is_active', true),
        jsonb_build_object('is_active', false),
        jsonb_build_object('reason', p_reason)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create User Reactivation RPC
CREATE OR REPLACE FUNCTION public.reactivate_user(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_role VARCHAR;
BEGIN
    v_actor_role := public.get_user_role_name(auth.uid());
    
    -- Only Super Admin can reactivate users
    IF v_actor_role != 'Super Admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admin can reactivate users.';
    END IF;

    -- Mark user as active
    UPDATE public.users SET is_active = true, updated_at = NOW() WHERE id = p_user_id;

    -- Log Audit Event
    PERFORM public.insert_audit_log(
        'USER_REACTIVATED',
        'User',
        p_user_id,
        jsonb_build_object('is_active', false),
        jsonb_build_object('is_active', true),
        jsonb_build_object('reason', p_reason)
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
