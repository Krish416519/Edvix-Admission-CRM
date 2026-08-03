-- =============================================================
-- 00000000000031_fix_admin_rls_policies.sql
-- Gives Super Admin / Admin full access to all admin-managed
-- tables so the browser can use the regular supabase client
-- instead of the secret-key supabaseAdmin client.
-- =============================================================

-- ─── universities ────────────────────────────────────────────────────────────
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read universities" ON public.universities;
CREATE POLICY "All authenticated can read universities" ON public.universities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage universities" ON public.universities;
CREATE POLICY "Admins manage universities" ON public.universities
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

-- ─── courses ─────────────────────────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read courses" ON public.courses;
CREATE POLICY "All authenticated can read courses" ON public.courses
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

-- ─── roles ───────────────────────────────────────────────────────────────────
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read roles" ON public.roles;
CREATE POLICY "All authenticated can read roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage roles" ON public.roles;
CREATE POLICY "Admins manage roles" ON public.roles
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

-- ─── permissions ─────────────────────────────────────────────────────────────
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read permissions" ON public.permissions;
CREATE POLICY "All authenticated can read permissions" ON public.permissions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Admins manage permissions" ON public.permissions
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

-- ─── role_permissions ────────────────────────────────────────────────────────
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read role_permissions" ON public.role_permissions;
CREATE POLICY "All authenticated can read role_permissions" ON public.role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

-- ─── ai_settings ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_settings') THEN
    ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins manage ai_settings" ON public.ai_settings;
    CREATE POLICY "Admins manage ai_settings" ON public.ai_settings
      FOR ALL
      USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;

-- ─── system_settings ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins manage system_settings" ON public.system_settings;
    CREATE POLICY "Admins manage system_settings" ON public.system_settings
      FOR ALL
      USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;

-- ─── notification_settings ───────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_settings') THEN
    ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins manage notification_settings" ON public.notification_settings;
    CREATE POLICY "Admins manage notification_settings" ON public.notification_settings
      FOR ALL
      USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;

-- ─── security_logs / audit_logs ──────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_logs') THEN
    ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins read security_logs" ON public.security_logs;
    CREATE POLICY "Admins read security_logs" ON public.security_logs
      FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins read audit_logs" ON public.audit_logs;
    CREATE POLICY "Admins read audit_logs" ON public.audit_logs
      FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_logs') THEN
    ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins read system_logs" ON public.system_logs;
    CREATE POLICY "Admins read system_logs" ON public.system_logs
      FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'))
      WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
  END IF;
END $$;
