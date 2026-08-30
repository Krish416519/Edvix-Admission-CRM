-- =============================================================================
-- 00000000000029_lead_assignment_system.sql
-- Full Lead Assignment System for Edvix CRM
-- =============================================================================

-- ─── 1. ADD "TEAM LEADER" ROLE ────────────────────────────────────────────────
INSERT INTO public.roles (name, organization_id) 
SELECT 'Team Leader', id FROM public.organizations LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- ─── 2. CREATE lead_assignments TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assignee_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  previous_assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignment_type VARCHAR(50) DEFAULT 'Manual', -- Manual | Round Robin | Workload
  notes           TEXT,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  is_active       BOOLEAN DEFAULT TRUE,  -- FALSE when reassigned/removed
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id    ON public.lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assignee   ON public.lead_assignments(assignee_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_by ON public.lead_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_active     ON public.lead_assignments(is_active) WHERE is_active = TRUE;

-- ─── 3. RLS ON lead_assignments ───────────────────────────────────────────────
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to lead_assignments" ON public.lead_assignments;
-- Super Admin & Admin can do everything
CREATE POLICY "Admins full access to lead_assignments" ON public.lead_assignments
  FOR ALL
  USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Manager TL can view lead_assignments" ON public.lead_assignments;
-- Manager & Team Leader can view assignments in their scope
CREATE POLICY "Manager TL can view lead_assignments" ON public.lead_assignments
  FOR SELECT
  USING (public.user_role() IN ('Manager', 'Team Leader'));

DROP POLICY IF EXISTS "Counselors see own assignments" ON public.lead_assignments;
-- Counselors can see their own assignments
CREATE POLICY "Counselors see own assignments" ON public.lead_assignments
  FOR SELECT
  USING (public.user_role() = 'Counselor' AND assignee_id = auth.uid());

-- ─── 4. GRANT users TABLE READ ACCESS TO AUTHENTICATED USERS ──────────────────
-- (So the assignment dropdown can fetch all users with their roles)
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all users" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── 5. TRIGGER: auto-update updated_at on lead_assignments ──────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_assignments_updated_at ON public.lead_assignments;
CREATE TRIGGER lead_assignments_updated_at
  BEFORE UPDATE ON public.lead_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── 6. FUNCTION: assign_lead ─────────────────────────────────────────────────
-- Atomically: deactivate old assignment, insert new, update lead, log activity, create notification
CREATE OR REPLACE FUNCTION public.assign_lead(
  p_lead_id       UUID,
  p_assignee_id   UUID,
  p_assigned_by   UUID,
  p_notes         TEXT DEFAULT NULL,
  p_assignment_type VARCHAR(50) DEFAULT 'Manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_assignee UUID;
  v_previous_name     TEXT;
  v_new_assignee_name TEXT;
  v_assigner_name     TEXT;
  v_lead_name         TEXT;
  v_assignment_id     UUID;
BEGIN
  -- Get current assignee from leads table
  SELECT assigned_counselor, first_name || ' ' || COALESCE(last_name, '')
  INTO v_previous_assignee, v_lead_name
  FROM public.leads WHERE id = p_lead_id;

  -- Resolve names for logging
  SELECT name INTO v_previous_name FROM public.users WHERE id = v_previous_assignee;
  SELECT name INTO v_new_assignee_name FROM public.users WHERE id = p_assignee_id;
  SELECT name INTO v_assigner_name FROM public.users WHERE id = p_assigned_by;

  -- Deactivate all existing active assignments for this lead
  UPDATE public.lead_assignments
  SET is_active = FALSE, updated_at = now()
  WHERE lead_id = p_lead_id AND is_active = TRUE;

  -- Insert new assignment record
  INSERT INTO public.lead_assignments (lead_id, assignee_id, assigned_by, previous_assignee_id, assignment_type, notes, is_active)
  VALUES (p_lead_id, p_assignee_id, p_assigned_by, v_previous_assignee, p_assignment_type, p_notes, TRUE)
  RETURNING id INTO v_assignment_id;

  -- Update the lead's assigned_counselor field
  UPDATE public.leads
  SET assigned_counselor = p_assignee_id, updated_at = now()
  WHERE id = p_lead_id;

  -- Log activity
  INSERT INTO public.lead_activities (lead_id, type, content, author)
  VALUES (
    p_lead_id,
    'assignment',
    'Lead assigned to ' || COALESCE(v_new_assignee_name, 'Unknown') ||
    CASE WHEN v_previous_name IS NOT NULL THEN ' (previously: ' || v_previous_name || ')' ELSE '' END ||
    CASE WHEN p_notes IS NOT NULL THEN '. Note: ' || p_notes ELSE '' END,
    COALESCE(v_assigner_name, 'System')
  );

   -- Create in-app notification for the new assignee
   INSERT INTO public.notifications (recipient_id, module, module_record_id, title, message, channel, priority, category, status)
   VALUES (
     p_assignee_id,
     'leads',
     p_lead_id,
     'New Lead Assigned',
     'You have been assigned lead: ' || TRIM(v_lead_name) || ' by ' || COALESCE(v_assigner_name, 'Admin'),
     'In-App',
     'High',
     'Assignment',
     'Unread'
   );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'lead_id', p_lead_id,
    'assignee_id', p_assignee_id,
    'previous_assignee_id', v_previous_assignee
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users (RLS on lead_assignments handles who can call it)
GRANT EXECUTE ON FUNCTION public.assign_lead TO authenticated;

-- ─── 7. FUNCTION: bulk_assign_leads ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(
  p_lead_ids      UUID[],
  p_assignee_id   UUID,
  p_assigned_by   UUID,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lead_id UUID;
  v_results JSONB := '[]'::JSONB;
  v_result  JSONB;
BEGIN
  FOREACH v_lead_id IN ARRAY p_lead_ids LOOP
    v_result := public.assign_lead(v_lead_id, p_assignee_id, p_assigned_by, p_notes, 'Bulk');
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'results', v_results, 'total', array_length(p_lead_ids, 1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_assign_leads TO authenticated;

-- ─── 8. VIEW: assignable_users ────────────────────────────────────────────────
-- Makes it easy to query active users with their role name and lead count
CREATE OR REPLACE VIEW public.assignable_users AS
SELECT
  u.id,
  u.name,
  u.email,
  u.phone,
  u.department,
  u.avatar_url,
  u.is_active,
  r.name AS role_name,
  r.id   AS role_id,
  COUNT(DISTINCT la.lead_id) AS active_lead_count
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.lead_assignments la ON la.assignee_id = u.id AND la.is_active = TRUE
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.email, u.phone, u.department, u.avatar_url, u.is_active, r.name, r.id
ORDER BY r.name, u.name;

GRANT SELECT ON public.assignable_users TO authenticated;
