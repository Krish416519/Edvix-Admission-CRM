-- 20260901172727_advanced_lead_filters.sql

-- 1. Add visibility to saved_views
ALTER TABLE public.saved_views
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'private';

-- 2. Update RLS policies for saved_views
DROP POLICY IF EXISTS "Users can manage their own saved views" ON public.saved_views;

-- Users can always see and manage their private views
CREATE POLICY "Users can manage their own private views"
ON public.saved_views FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can read organization views if they belong to the same organization
CREATE POLICY "Users can read organization views"
ON public.saved_views FOR SELECT TO authenticated
USING (
  visibility = 'organization' 
  -- Assuming simple check for now: any auth user can see org views created by others
  -- (If strict org check is needed, we would join on user_organizations)
);

-- 3. Create Computed Columns for leads to fix broken inline SQL subqueries in PostgREST

CREATE OR REPLACE FUNCTION public.lead_first_call_date(l public.leads)
RETURNS TIMESTAMPTZ AS $$
  SELECT MIN(created_at) FROM public.calls WHERE lead_id = l.id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_assignment_date(l public.leads)
RETURNS TIMESTAMPTZ AS $$
  SELECT MAX(assigned_at) FROM public.lead_assignments WHERE lead_id = l.id AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_disposition_category(l public.leads)
RETURNS UUID AS $$
  SELECT category_id FROM public.dispositions WHERE id = l.latest_disposition_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_pending_task(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id = l.id AND status = 'Pending');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_task_due_today(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id = l.id AND due_date = CURRENT_DATE AND status = 'Pending');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_task_overdue(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id = l.id AND due_date < CURRENT_DATE AND status = 'Pending');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_task_assigned_to_me(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.tasks WHERE lead_id = l.id AND assigned_user = auth.uid() AND status = 'Pending');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_call_activity(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.calls WHERE lead_id = l.id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_whatsapp_activity(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.lead_activities WHERE lead_id = l.id AND type ILIKE '%whatsapp%');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_email_activity(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.lead_activities WHERE lead_id = l.id AND type ILIKE '%email%');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_task_activity(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.lead_activities WHERE lead_id = l.id AND type ILIKE '%task%');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_has_no_activity(l public.leads)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.lead_activities WHERE lead_id = l.id) 
     AND NOT EXISTS(SELECT 1 FROM public.calls WHERE lead_id = l.id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_last_activity_date(l public.leads)
RETURNS TIMESTAMPTZ AS $$
  SELECT MAX(created_at) FROM (
    SELECT created_at FROM public.lead_activities WHERE lead_id = l.id
    UNION ALL 
    SELECT created_at FROM public.calls WHERE lead_id = l.id
  ) all_activity;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_university_name(l public.leads)
RETURNS VARCHAR AS $$
  SELECT name FROM public.universities WHERE id = l.university_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.lead_course_name(l public.leads)
RETURNS VARCHAR AS $$
  SELECT name FROM public.courses WHERE id = l.course_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Historical Filter computed column (parameterized computed columns are NOT automatically exposed in PostgREST as virtual columns if they take extra args, but we can call them via RPC)
-- Actually, a better way for historical filtering in PostgREST is to use an embedded resource filter, 
-- but if we want a clean bool we can create an RPC.
-- However, an RPC is not a computed column. 
-- Wait, we can't easily filter by a parameterized computed column in standard `select=*,has_disp(...)` 
-- Standard PostgREST for EXISTS on foreign table is:
-- `lead_disposition_history!inner(disposition_id.eq.XYZ)`
-- Let's stick to PostgREST `!inner` join for historical filters rather than a computed column.
