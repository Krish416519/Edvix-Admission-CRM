-- =============================================================
-- 00000000000030_admin_user_management_functions.sql
-- Server-side functions for creating/updating/deleting users
-- safely without exposing the service role key in the browser.
-- =============================================================

-- ─── 1. CREATE USER (called by Super Admin / Admin) ──────────────────────────
-- This function cannot actually call auth.admin; only the service role can.
-- Instead we handle the DB side here and use signUp on the client side.
-- The user creation flow:
--   1. Browser calls supabase.auth.signUp() → creates auth.users row
--   2. The existing trigger (on_auth_user_created) creates the public.users row
--   3. Browser calls this RPC to set name + role immediately after signup

CREATE OR REPLACE FUNCTION public.admin_set_user_role_and_name(
  p_user_id   UUID,
  p_name      TEXT,
  p_role_id   UUID,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only Super Admin or Admin can call this
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.users
  SET
    name      = p_name,
    full_name = p_name,
    role_id   = p_role_id,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    -- Row may not exist yet (trigger runs async) – insert it
    INSERT INTO public.users (id, name, full_name, role_id, is_active)
    VALUES (p_user_id, p_name, p_name, p_role_id, p_is_active)
    ON CONFLICT (id) DO UPDATE
    SET name = p_name, full_name = p_name, role_id = p_role_id, is_active = p_is_active;
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role_and_name TO authenticated;

-- ─── 2. UPDATE USER (name + role + active status) ────────────────────────────
-- Same as above but explicitly for editing existing users.
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id   UUID,
  p_name      TEXT DEFAULT NULL,
  p_role_id   UUID DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.users
  SET
    name       = COALESCE(p_name,      name),
    full_name  = COALESCE(p_name,      full_name),
    role_id    = COALESCE(p_role_id,   role_id),
    is_active  = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;

-- ─── 3. SOFT-DELETE USER (deactivate, not hard-delete) ───────────────────────
CREATE OR REPLACE FUNCTION public.admin_deactivate_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.users SET is_active = FALSE, updated_at = now() WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_user TO authenticated;

-- ─── 4. Ensure users table has UPDATE policy for admins ──────────────────────
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
