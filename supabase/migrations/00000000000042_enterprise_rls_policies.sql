-- 00000000000042_enterprise_rls_policies.sql
-- Drop old policies and enforce strict Enterprise RBAC policies via has_permission

-- 1. Leads Table
DROP POLICY IF EXISTS "Admins full access leads" ON public.leads;
DROP POLICY IF EXISTS "Counselors view/edit own leads" ON public.leads;
DROP POLICY IF EXISTS "Accounts read only leads" ON public.leads;

CREATE POLICY "Enable Read Leads" ON public.leads FOR SELECT USING (
    public.has_permission('Read', 'Leads') AND
    (
        public.user_role() IN ('Super Admin', 'Admin') OR
        assigned_counselor = auth.uid() OR
        -- Manager sees team's leads
        assigned_counselor IN (SELECT id FROM public.users WHERE team = (SELECT team FROM public.users WHERE id = auth.uid()))
    )
);

CREATE POLICY "Enable Update Leads" ON public.leads FOR UPDATE USING (
    public.has_permission('Update', 'Leads') AND
    (
        public.user_role() IN ('Super Admin', 'Admin') OR
        assigned_counselor = auth.uid()
    )
);

CREATE POLICY "Enable Delete Leads" ON public.leads FOR DELETE USING (
    public.has_permission('Delete', 'Leads')
);

CREATE POLICY "Enable Create Leads" ON public.leads FOR INSERT WITH CHECK (
    public.has_permission('Create', 'Leads')
);

-- Apply permission logs trigger to leads
DROP TRIGGER IF EXISTS log_leads_permissions ON public.leads;
CREATE TRIGGER log_leads_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_permission_event();

-- 2. Finance / Payments Table
DROP POLICY IF EXISTS "Admins full access payments" ON public.payments;
DROP POLICY IF EXISTS "Accounts full access payments" ON public.payments;
DROP POLICY IF EXISTS "Counselors view payments for own leads" ON public.payments;

CREATE POLICY "Enable Read Payments" ON public.payments FOR SELECT USING (
    public.has_permission('Read', 'Finance') AND
    (
        public.user_role() IN ('Super Admin', 'Admin', 'Accounts') OR
        -- Counselor sees payments for their assigned leads
        lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
    )
);

CREATE POLICY "Enable Update Payments" ON public.payments FOR UPDATE USING (
    public.has_permission('Update', 'Finance')
);

CREATE POLICY "Enable Create Payments" ON public.payments FOR INSERT WITH CHECK (
    public.has_permission('Create', 'Finance')
);

CREATE POLICY "Enable Delete Payments" ON public.payments FOR DELETE USING (
    public.has_permission('Delete', 'Finance')
);

-- Apply permission logs trigger to payments
DROP TRIGGER IF EXISTS log_payments_permissions ON public.payments;
CREATE TRIGGER log_payments_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_permission_event();

-- 3. Audit Logs (System Settings)
CREATE POLICY "View Audit Logs" ON public.permission_logs FOR SELECT USING (
    public.has_permission('View Reports', 'System Settings')
);