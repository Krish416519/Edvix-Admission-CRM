-- 00000000000001_rls_policies.sql
-- Enables Row Level Security on all tables and applies Role-Based Access Control (RBAC).

--------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY
--------------------------------------------------

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- 2. HELPER FUNCTIONS
--------------------------------------------------

-- Define helper functions in the 'public' schema to avoid permissions issues with the 'auth' schema.

-- Function to extract user role directly from JWT metadata
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.user_metadata.role', true), '')::text;
$$ LANGUAGE sql STABLE;

-- Function to check if current user is an Admin or Super Admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT public.user_role() IN ('Admin', 'Super Admin');
$$ LANGUAGE sql STABLE;

--------------------------------------------------
-- 3. GLOBAL ADMIN POLICIES (Full Access)
--------------------------------------------------

-- Roles, Permissions, Users
CREATE POLICY "Admins have full access to roles" ON public.roles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to permissions" ON public.permissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to role_permissions" ON public.role_permissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to users" ON public.users FOR ALL USING (public.is_admin());

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
-- Allow public insert to users table so trigger/webhook can populate it on signup
CREATE POLICY "Allow service role to insert users" ON public.users FOR INSERT WITH CHECK (true);

--------------------------------------------------
-- 4. MASTER DATA (Universities, Courses)
--------------------------------------------------

-- Admins: Full Access
CREATE POLICY "Admins have full access to universities" ON public.universities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access to courses" ON public.courses FOR ALL USING (public.is_admin());

-- Everyone Else: Read-Only
CREATE POLICY "Authenticated users can view universities" ON public.universities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view courses" ON public.courses FOR SELECT USING (auth.role() = 'authenticated');

--------------------------------------------------
-- 5. CRM CORE (Leads, Tasks, Notes, Activities)
--------------------------------------------------

-- Leads
CREATE POLICY "Admins full access leads" ON public.leads FOR ALL USING (public.is_admin());
CREATE POLICY "Counselors view/edit own leads" ON public.leads FOR ALL USING (
    public.user_role() = 'Counselor' AND counselor_id = auth.uid()
);
CREATE POLICY "Accounts read only leads" ON public.leads FOR SELECT USING (public.user_role() = 'Accounts');

-- Lead Activities
CREATE POLICY "Admins full access activities" ON public.lead_activities FOR ALL USING (public.is_admin());
CREATE POLICY "Counselors view/edit activities for own leads" ON public.lead_activities FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE counselor_id = auth.uid())
);

-- Tasks
CREATE POLICY "Admins full access tasks" ON public.tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Users view/edit own assigned tasks" ON public.tasks FOR ALL USING (
    assigned_to_id = auth.uid()
);

-- Notes
CREATE POLICY "Admins full access notes" ON public.notes FOR ALL USING (public.is_admin());
CREATE POLICY "Counselors view/edit notes for own leads" ON public.notes FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE counselor_id = auth.uid())
);

--------------------------------------------------
-- 6. ADMISSIONS & FINANCE
--------------------------------------------------

-- Admissions
CREATE POLICY "Admins full access admissions" ON public.admissions FOR ALL USING (public.is_admin());
CREATE POLICY "Counselors view/edit own admissions" ON public.admissions FOR ALL USING (
    public.user_role() = 'Counselor' AND counselor_id = auth.uid()
);
CREATE POLICY "Accounts view all admissions" ON public.admissions FOR SELECT USING (public.user_role() = 'Accounts');

-- Documents
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL USING (public.is_admin());
CREATE POLICY "Counselors view/edit documents for own leads" ON public.documents FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE counselor_id = auth.uid())
);
CREATE POLICY "Accounts view documents" ON public.documents FOR SELECT USING (public.user_role() = 'Accounts');

-- Payments
CREATE POLICY "Admins full access payments" ON public.payments FOR ALL USING (public.is_admin());
CREATE POLICY "Accounts full access payments" ON public.payments FOR ALL USING (public.user_role() = 'Accounts');
CREATE POLICY "Counselors view payments for own leads" ON public.payments FOR SELECT USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE counselor_id = auth.uid())
);

--------------------------------------------------
-- 7. SYSTEM LOGS & NOTIFICATIONS
--------------------------------------------------

-- Notifications
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Automation & AI Logs
CREATE POLICY "Admins full access automation_logs" ON public.automation_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access ai_logs" ON public.ai_logs FOR ALL USING (public.is_admin());
-- System needs to insert logs (this would typically be a service_role action, but opening insert for testing)
CREATE POLICY "Authenticated users can insert automation_logs" ON public.automation_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert ai_logs" ON public.ai_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
