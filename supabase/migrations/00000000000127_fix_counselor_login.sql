-- 00000000000127_fix_counselor_login.sql

-- =============================================================
-- Fix: Allow counselors to update their own profile (last_login)
-- The login flow in AuthContext updates users.last_login on login,
-- but there was no UPDATE policy for non-admin users.
-- Also ensures counselors have proper org membership.
-- =============================================================

-- Add UPDATE policy for users to update their own last_login and profile
DROP POLICY IF EXISTS "Users can update own last_login" ON public.users;
CREATE POLICY "Users can update own last_login"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Also add a broader UPDATE policy for profile fields counselors should be able to edit
DROP POLICY IF EXISTS "Users can update own profile fields" ON public.users;
CREATE POLICY "Users can update own profile fields"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Ensure Counselors have an entry in organization_users if they don't exist
-- (Handles the case where a counselor was created in auth but not migrated to org)
-- Only run if both tables exist
DO $$
DECLARE
    v_org_id UUID;
    v_counselor_role_id UUID;
BEGIN
    -- Get the Edvix organization ID
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'edvix' LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        -- Get the Counselor role ID (if role exists)
        SELECT id INTO v_counselor_role_id FROM public.roles WHERE name = 'Counselor' LIMIT 1;
        
        IF v_counselor_role_id IS NOT NULL THEN
            -- Insert counselor users into organization_users if not already present
            INSERT INTO public.organization_users (organization_id, user_id, status)
            SELECT v_org_id, u.id, 'Active'
            FROM public.users u
            WHERE u.role_id = v_counselor_role_id
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Silently ignore - tables may not exist yet in partial migrations
    NULL;
END $$;
