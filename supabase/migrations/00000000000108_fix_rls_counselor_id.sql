-- 00000000000108_fix_rls_counselor_id.sql
-- Fix broken RLS policies caused by renaming counselor_id to assigned_counselor in leads table

-- 1. Leads Table
DROP POLICY IF EXISTS "Counselors view/edit own leads" ON public.leads;
CREATE POLICY "Counselors view/edit own leads" ON public.leads FOR ALL USING (
    public.user_role() = 'Counselor' AND assigned_counselor = auth.uid()
);

-- 2. Lead Activities
DROP POLICY IF EXISTS "Counselors view/edit activities for own leads" ON public.lead_activities;
CREATE POLICY "Counselors view/edit activities for own leads" ON public.lead_activities FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);

-- 3. Notes
DROP POLICY IF EXISTS "Counselors view/edit notes for own leads" ON public.notes;
CREATE POLICY "Counselors view/edit notes for own leads" ON public.notes FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);

-- 4. Documents
DROP POLICY IF EXISTS "Counselors view/edit documents for own leads" ON public.documents;
CREATE POLICY "Counselors view/edit documents for own leads" ON public.documents FOR ALL USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);

-- 5. Payments
DROP POLICY IF EXISTS "Counselors view payments for own leads" ON public.payments;
CREATE POLICY "Counselors view payments for own leads" ON public.payments FOR SELECT USING (
    public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);
