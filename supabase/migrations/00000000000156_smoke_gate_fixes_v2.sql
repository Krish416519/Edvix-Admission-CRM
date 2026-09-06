-- 00000000000156_smoke_gate_fixes_v2.sql
-- Phase 2.1.2: Smoke Gate Remediation (Part 2)
-- Fixes unauthenticated access to users and system_backups

-- 1. Lock down users table for SELECT
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read all active users" ON public.users;

CREATE POLICY "Active users can read users" ON public.users
    FOR SELECT USING (public.get_active_user_id() IS NOT NULL);

-- 2. Ensure RLS is enabled on system_backups (it was missing from enable_rls_remaining_tables)
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
