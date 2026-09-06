-- 00000000000149_enable_rls_remaining_tables.sql

DO $$
BEGIN
  -- 1. ai_feedback
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_feedback') THEN
    ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins have full access to ai_feedback" ON public.ai_feedback;
    DROP POLICY IF EXISTS "Counselors can view their own ai_feedback" ON public.ai_feedback;
    DROP POLICY IF EXISTS "Counselors can insert their own ai_feedback" ON public.ai_feedback;
    CREATE POLICY "Admins have full access to ai_feedback" ON public.ai_feedback FOR ALL USING (public.is_admin());
    CREATE POLICY "Counselors can view their own ai_feedback" ON public.ai_feedback FOR SELECT USING (counselor_id = auth.uid());
    CREATE POLICY "Counselors can insert their own ai_feedback" ON public.ai_feedback FOR INSERT WITH CHECK (counselor_id = auth.uid());
  END IF;

  -- 2. ai_manager_alerts
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_manager_alerts') THEN
    ALTER TABLE public.ai_manager_alerts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins have full access to ai_manager_alerts" ON public.ai_manager_alerts;
    DROP POLICY IF EXISTS "Counselors can view their own ai_manager_alerts" ON public.ai_manager_alerts;
    CREATE POLICY "Admins have full access to ai_manager_alerts" ON public.ai_manager_alerts FOR ALL USING (public.is_admin());
    CREATE POLICY "Counselors can view their own ai_manager_alerts" ON public.ai_manager_alerts FOR SELECT USING (counselor_id = auth.uid());
  END IF;

  -- 3. ai_objection_library
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_objection_library') THEN
    ALTER TABLE public.ai_objection_library ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins have full access to ai_objection_library" ON public.ai_objection_library;
    DROP POLICY IF EXISTS "Authenticated users can read ai_objection_library" ON public.ai_objection_library;
    CREATE POLICY "Admins have full access to ai_objection_library" ON public.ai_objection_library FOR ALL USING (public.is_admin());
    CREATE POLICY "Authenticated users can read ai_objection_library" ON public.ai_objection_library FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- 4. counselor_performance
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'counselor_performance') THEN
    ALTER TABLE public.counselor_performance ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins have full access to counselor_performance" ON public.counselor_performance;
    DROP POLICY IF EXISTS "Counselors can view their own counselor_performance" ON public.counselor_performance;
    CREATE POLICY "Admins have full access to counselor_performance" ON public.counselor_performance FOR ALL USING (public.is_admin());
    CREATE POLICY "Counselors can view their own counselor_performance" ON public.counselor_performance FOR SELECT USING (counselor_id = auth.uid());
  END IF;

  -- 5. department_permissions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'department_permissions') THEN
    ALTER TABLE public.department_permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to department_permissions" ON public.department_permissions;
    DROP POLICY IF EXISTS "Authenticated users can read department_permissions" ON public.department_permissions;
    CREATE POLICY "Super Admins have full access to department_permissions" ON public.department_permissions FOR ALL USING (public.is_super_admin());
    CREATE POLICY "Authenticated users can read department_permissions" ON public.department_permissions FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- 6. team_permissions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_permissions') THEN
    ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to team_permissions" ON public.team_permissions;
    DROP POLICY IF EXISTS "Authenticated users can read team_permissions" ON public.team_permissions;
    CREATE POLICY "Super Admins have full access to team_permissions" ON public.team_permissions FOR ALL USING (public.is_super_admin());
    CREATE POLICY "Authenticated users can read team_permissions" ON public.team_permissions FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- 7. domains
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'domains') THEN
    ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to domains" ON public.domains;
    DROP POLICY IF EXISTS "Authenticated users can read domains" ON public.domains;
    CREATE POLICY "Super Admins have full access to domains" ON public.domains FOR ALL USING (public.is_super_admin());
    CREATE POLICY "Authenticated users can read domains" ON public.domains FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- 8. organization_settings
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_settings') THEN
    ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to organization_settings" ON public.organization_settings;
    DROP POLICY IF EXISTS "Authenticated users can read organization_settings" ON public.organization_settings;
    CREATE POLICY "Super Admins have full access to organization_settings" ON public.organization_settings FOR ALL USING (public.is_super_admin());
    CREATE POLICY "Authenticated users can read organization_settings" ON public.organization_settings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- 9. permission_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permission_logs') THEN
    ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins can read permission_logs" ON public.permission_logs;
    DROP POLICY IF EXISTS "Service role can insert permission_logs" ON public.permission_logs;
    CREATE POLICY "Super Admins can read permission_logs" ON public.permission_logs FOR SELECT USING (public.is_super_admin());
    CREATE POLICY "Service role can insert permission_logs" ON public.permission_logs FOR INSERT WITH CHECK (true);
  END IF;

  -- 10. system_backups
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_backups') THEN
    ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to system_backups" ON public.system_backups;
    CREATE POLICY "Super Admins have full access to system_backups" ON public.system_backups FOR ALL USING (public.is_super_admin());
  END IF;

  -- 11. tenant_audit_logs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_audit_logs') THEN
    ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Super Admins have full access to tenant_audit_logs" ON public.tenant_audit_logs;
    DROP POLICY IF EXISTS "Admins can view tenant_audit_logs" ON public.tenant_audit_logs;
    DROP POLICY IF EXISTS "Service role can insert tenant_audit_logs" ON public.tenant_audit_logs;
    CREATE POLICY "Super Admins have full access to tenant_audit_logs" ON public.tenant_audit_logs FOR ALL USING (public.is_super_admin());
    CREATE POLICY "Admins can view tenant_audit_logs" ON public.tenant_audit_logs FOR SELECT USING (public.is_admin());
    CREATE POLICY "Service role can insert tenant_audit_logs" ON public.tenant_audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;
