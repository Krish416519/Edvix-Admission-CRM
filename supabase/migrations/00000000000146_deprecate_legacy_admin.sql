-- 00000000000146_deprecate_legacy_admin.sql
-- RBAC PHASE 1.5 - SECURITY RECONCILIATION

-- 1. Create global is_active check
CREATE OR REPLACE FUNCTION public.is_active_user() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND is_active = true);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Deprecate legacy is_admin() and is_admin_or_super() - restrict to Super Admin ONLY
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT public.is_super_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_super() RETURNS BOOLEAN AS $$
  SELECT public.is_super_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Update Domain Functions to enforce is_active
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND u.is_active = true AND r.name = 'Super Admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_name VARCHAR) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    JOIN public.domains d ON u.domain_id = d.id
    WHERE u.id = auth.uid() 
    AND u.is_active = true
    AND r.name LIKE '%Admin' 
    AND d.name = p_domain_name
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager_of(p_user_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_active = true
      AND (
          id IN (SELECT manager_id FROM public.users WHERE id = p_user_id) OR
          team = (SELECT team FROM public.users WHERE id = p_user_id)
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Rewrite Core RLS (Leads, Tasks) to enforce is_active for normal users
DROP POLICY IF EXISTS "Enable Read Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Update Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Create Leads" ON public.leads;

CREATE POLICY "Enable Read Leads" ON public.leads FOR SELECT USING (
    public.is_active_user() AND (
        public.is_super_admin() OR
        public.is_domain_admin('Admission') OR
        assigned_counselor = auth.uid() OR
        public.is_manager_of(assigned_counselor)
    )
);

CREATE POLICY "Enable Update Leads" ON public.leads FOR UPDATE USING (
    public.is_active_user() AND (
        public.is_super_admin() OR
        public.is_domain_admin('Admission') OR
        assigned_counselor = auth.uid() OR
        public.is_manager_of(assigned_counselor)
    )
);

CREATE POLICY "Enable Create Leads" ON public.leads FOR INSERT WITH CHECK (
    public.is_active_user() AND (
        public.is_super_admin() OR
        public.is_domain_admin('Admission') OR
        public.get_user_role_name(auth.uid()) IN ('Admission Manager', 'Team Leader', 'Admission Executive', 'Counselor')
    )
);


DROP POLICY IF EXISTS "Enable Select Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Enable Update Tasks" ON public.tasks;

CREATE POLICY "Enable Select Tasks" ON public.tasks FOR SELECT USING (
    public.is_active_user() AND (
        public.is_super_admin() OR
        public.is_domain_admin('Admission') OR
        assigned_user = auth.uid() OR
        public.is_manager_of(assigned_user) OR
        created_by = auth.uid()
    )
);

CREATE POLICY "Enable Update Tasks" ON public.tasks FOR UPDATE USING (
    public.is_active_user() AND (
        public.is_super_admin() OR
        public.is_domain_admin('Admission') OR
        assigned_user = auth.uid() OR
        public.is_manager_of(assigned_user) OR
        created_by = auth.uid()
    )
);

-- 5. Rewrite Legacy Policies relying on is_admin()

-- Universities & Courses (Admission)
DROP POLICY IF EXISTS "Admins have full access to universities" ON public.universities;
CREATE POLICY "Admins have full access to universities" ON public.universities FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Admission')
);

DROP POLICY IF EXISTS "Admins have full access to courses" ON public.courses;
CREATE POLICY "Admins have full access to courses" ON public.courses FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Admission')
);

-- Admissions & Documents (Admission)
DROP POLICY IF EXISTS "Admins full access admissions" ON public.admissions;
CREATE POLICY "Admins full access admissions" ON public.admissions FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Admission')
);

DROP POLICY IF EXISTS "Admins full access documents" ON public.documents;
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Admission')
);

-- Finance Tables (Finance)

DROP POLICY IF EXISTS "Admins and Accounts full access ledger" ON public.ledger_entries;
CREATE POLICY "Admins and Accounts full access ledger" ON public.ledger_entries FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Finance') OR public.get_user_role_name(auth.uid()) = 'Accounts'
);

DROP POLICY IF EXISTS "Admins and Accounts full access payouts" ON public.university_payouts;
CREATE POLICY "Admins and Accounts full access payouts" ON public.university_payouts FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Finance') OR public.get_user_role_name(auth.uid()) = 'Accounts'
);

DROP POLICY IF EXISTS "Admins and Accounts full access commissions" ON public.commissions;
CREATE POLICY "Admins and Accounts full access commissions" ON public.commissions FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Finance') OR public.get_user_role_name(auth.uid()) = 'Accounts'
);


-- Notifications (Global + Domain)
DROP POLICY IF EXISTS "Admins full access notifications" ON public.notifications;
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL USING (
    public.is_super_admin() OR public.is_domain_admin('Admission') OR public.is_domain_admin('HR') OR public.is_domain_admin('Finance')
);

-- System Logs (Global Only)
DROP POLICY IF EXISTS "Admins full access automation_logs" ON public.automation_logs;
CREATE POLICY "Admins full access automation_logs" ON public.automation_logs FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins full access ai_logs" ON public.ai_logs;
CREATE POLICY "Admins full access ai_logs" ON public.ai_logs FOR ALL USING (public.is_super_admin());

-- Roles and Permissions (Global Only)
DROP POLICY IF EXISTS "Admins have full access to roles" ON public.roles;
CREATE POLICY "Admins have full access to roles" ON public.roles FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins have full access to permissions" ON public.permissions;
CREATE POLICY "Admins have full access to permissions" ON public.permissions FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "Admins have full access to role_permissions" ON public.role_permissions;
CREATE POLICY "Admins have full access to role_permissions" ON public.role_permissions FOR ALL USING (public.is_super_admin());

-- University Ops Hub
DROP POLICY IF EXISTS slas_admin_full ON public.university_slas;
CREATE POLICY slas_admin_full ON public.university_slas FOR ALL USING (public.is_super_admin() OR public.is_domain_admin('Admission'));


DROP POLICY IF EXISTS responses_admin_full ON public.university_responses;
CREATE POLICY responses_admin_full ON public.university_responses FOR ALL USING (public.is_super_admin() OR public.is_domain_admin('Admission'));

-- BI Reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bi_saved_reports') THEN
    DROP POLICY IF EXISTS "Users can view saved reports" ON public.bi_saved_reports;
    EXECUTE 'CREATE POLICY "Users can view saved reports" ON public.bi_saved_reports FOR SELECT USING (public.is_super_admin() OR created_by = auth.uid())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bi_scheduled_reports') THEN
    DROP POLICY IF EXISTS "Users can view scheduled reports" ON public.bi_scheduled_reports;
    EXECUTE 'CREATE POLICY "Users can view scheduled reports" ON public.bi_scheduled_reports FOR SELECT USING (public.is_super_admin() OR created_by = auth.uid())';
  END IF;
END $$;
