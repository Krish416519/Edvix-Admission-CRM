-- 00000000000163_disposition_security_and_atomicity.sql
-- Production Closure Gate: Disposition Security, Atomic RPC, Hierarchy Validation, Payments & Storage Hardening

-- ============================================================================
-- 1. PAYMENTS VIEW & INSTALLMENTS RLS HARDENING
-- ============================================================================
ALTER VIEW IF EXISTS public.payments SET (security_invoker = true);

-- Revoke select from anon so unauthorized calls get explicit 401/403
REVOKE ALL ON public.payments FROM anon, public;
GRANT SELECT ON public.payments TO authenticated;

-- Ensure payment_installments has proper scoped policies
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.payment_installments;
CREATE POLICY "tenant_isolation_policy" ON public.payment_installments
FOR ALL TO authenticated
USING (is_member_of(organization_id))
WITH CHECK (is_member_of(organization_id));

DROP POLICY IF EXISTS "Admins full access to payment_installments" ON public.payment_installments;
CREATE POLICY "Admins full access to payment_installments" ON public.payment_installments
FOR ALL TO authenticated
USING (
  is_super_admin() OR is_admin() OR (get_user_role_name(auth.uid()) = 'Accounts')
)
WITH CHECK (
  is_super_admin() OR is_admin() OR (get_user_role_name(auth.uid()) = 'Accounts')
);

-- ============================================================================
-- 2. HARDEN LEAD DISPOSITION HISTORY RLS
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated insert to lead_disposition_history" ON public.lead_disposition_history;
DROP POLICY IF EXISTS "Authorized users insert lead disposition history" ON public.lead_disposition_history;

CREATE POLICY "Authorized users insert lead disposition history" ON public.lead_disposition_history
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    is_super_admin()
    OR is_admin()
    OR lead_id IN (
      SELECT id FROM public.leads
      WHERE assigned_counselor = auth.uid()
         OR is_manager_of(assigned_counselor)
         OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
    )
  )
);

-- Block direct manual updates/deletes to history to preserve immutable audit integrity
DROP POLICY IF EXISTS "Block update on lead disposition history" ON public.lead_disposition_history;
CREATE POLICY "Block update on lead disposition history" ON public.lead_disposition_history
FOR UPDATE TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Block delete on lead disposition history" ON public.lead_disposition_history;
CREATE POLICY "Block delete on lead disposition history" ON public.lead_disposition_history
FOR DELETE TO authenticated
USING (is_super_admin());

-- ============================================================================
-- 3. CROSS-PARENT DISPOSITION HIERARCHY VALIDATION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_disposition_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_disp_id UUID;
  v_next_disp_id UUID;
BEGIN
  -- 1. Validate sub_disposition belongs to disposition
  IF NEW.sub_disposition_id IS NOT NULL THEN
    SELECT disposition_id INTO v_sub_disp_id
    FROM public.sub_dispositions
    WHERE id = NEW.sub_disposition_id;

    IF v_sub_disp_id IS NULL OR v_sub_disp_id IS DISTINCT FROM NEW.disposition_id THEN
      RAISE EXCEPTION 'Sub-disposition % does not belong to disposition %', NEW.sub_disposition_id, NEW.disposition_id;
    END IF;
  END IF;

  -- 2. Validate next_action belongs to disposition
  IF NEW.next_action_id IS NOT NULL THEN
    SELECT disposition_id INTO v_next_disp_id
    FROM public.next_actions
    WHERE id = NEW.next_action_id;

    IF v_next_disp_id IS NULL OR v_next_disp_id IS DISTINCT FROM NEW.disposition_id THEN
      RAISE EXCEPTION 'Next action % does not belong to disposition %', NEW.next_action_id, NEW.disposition_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on lead_disposition_history
DROP TRIGGER IF EXISTS trg_validate_history_hierarchy ON public.lead_disposition_history;
CREATE TRIGGER trg_validate_history_hierarchy
BEFORE INSERT OR UPDATE ON public.lead_disposition_history
FOR EACH ROW
EXECUTE FUNCTION public.validate_disposition_hierarchy();

-- Trigger on leads for latest_disposition_id & latest_sub_disposition_id
CREATE OR REPLACE FUNCTION public.validate_lead_disposition_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_disp_id UUID;
BEGIN
  IF NEW.latest_sub_disposition_id IS NOT NULL THEN
    IF NEW.latest_disposition_id IS NULL THEN
      RAISE EXCEPTION 'Cannot set latest_sub_disposition_id without latest_disposition_id';
    END IF;

    SELECT disposition_id INTO v_sub_disp_id
    FROM public.sub_dispositions
    WHERE id = NEW.latest_sub_disposition_id;

    IF v_sub_disp_id IS NULL OR v_sub_disp_id IS DISTINCT FROM NEW.latest_disposition_id THEN
      RAISE EXCEPTION 'Sub-disposition % does not belong to disposition %', NEW.latest_sub_disposition_id, NEW.latest_disposition_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lead_disposition_hierarchy ON public.leads;
CREATE TRIGGER trg_validate_lead_disposition_hierarchy
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.validate_lead_disposition_hierarchy();

-- ============================================================================
-- 4. SPECIAL FORM TYPE CHECK CONSTRAINT
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_dispositions_special_form_type'
  ) THEN
    ALTER TABLE public.dispositions
    ADD CONSTRAINT chk_dispositions_special_form_type
    CHECK (
      special_form_type IS NULL OR special_form_type IN (
        'counselled', 'semester_fee_paid', 'loan_rejected', 'meeting_done', 'document_collected'
      )
    );
  END IF;
END $$;

-- ============================================================================
-- 5. CANONICAL ATOMIC RPC: submit_lead_disposition
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_lead_disposition(
  p_lead_id UUID,
  p_disposition_id UUID,
  p_sub_disposition_id UUID DEFAULT NULL,
  p_next_action_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_follow_up_at TIMESTAMPTZ DEFAULT NULL,
  p_lost_reason TEXT DEFAULT NULL,
  p_competitor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_lead RECORD;
  v_disp RECORD;
  v_sub_disp_name TEXT := NULL;
  v_next_act_name TEXT := NULL;
  v_sub_disp_parent UUID;
  v_next_act_parent UUID;
  v_target_status TEXT;
  v_author_name TEXT;
  v_activity_content TEXT;
  v_lead_context TEXT;
  v_task_type TEXT := 'Call';
  v_due_date DATE;
  v_due_time TIME;
BEGIN
  -- 1. Ensure authenticated caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User session required';
  END IF;

  -- 2. Fetch and lock lead record to prevent concurrent race conditions
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead with ID % not found', p_lead_id;
  END IF;

  -- 3. Scope / Ownership authorization check
  IF NOT (
    is_super_admin()
    OR is_admin()
    OR is_domain_admin('Admission')
    OR v_lead.assigned_counselor = v_caller_id
    OR is_manager_of(v_lead.assigned_counselor)
    OR (user_role() = 'Counselor' AND v_lead.assigned_counselor IS NULL)
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to disposition this lead';
  END IF;

  -- Fetch lead's organization CRM context
  IF v_lead.organization_id IS NOT NULL THEN
    SELECT crm_context INTO v_lead_context
    FROM public.organizations
    WHERE id = v_lead.organization_id;
  END IF;

  -- 4. Fetch and validate disposition
  SELECT * INTO v_disp
  FROM public.dispositions
  WHERE id = p_disposition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Disposition with ID % does not exist', p_disposition_id;
  END IF;

  IF NOT COALESCE(v_disp.is_active, true) THEN
    RAISE EXCEPTION 'Disposition "%" is deactivated and cannot be selected', v_disp.name;
  END IF;

  -- Validate pipeline context match
  IF v_lead_context IS NOT NULL AND v_disp.crm_context IS NOT NULL AND v_lead_context IS DISTINCT FROM v_disp.crm_context THEN
    RAISE EXCEPTION 'Disposition context (%) does not match Lead organization context (%)', v_disp.crm_context, v_lead_context;
  END IF;

  -- 5. Validate Required Fields per disposition configuration
  IF COALESCE(v_disp.requires_note, false) AND (p_notes IS NULL OR trim(p_notes) = '') THEN
    RAISE EXCEPTION 'Notes are required for disposition "%"', v_disp.name;
  END IF;

  IF COALESCE(v_disp.requires_follow_up, false) AND p_follow_up_at IS NULL THEN
    RAISE EXCEPTION 'Follow-up date/time is required for disposition "%"', v_disp.name;
  END IF;

  IF COALESCE(v_disp.next_action_required, false) AND p_next_action_id IS NULL THEN
    RAISE EXCEPTION 'Next action is required for disposition "%"', v_disp.name;
  END IF;

  -- 6. Validate Sub-disposition hierarchy
  IF p_sub_disposition_id IS NOT NULL THEN
    SELECT name, disposition_id INTO v_sub_disp_name, v_sub_disp_parent
    FROM public.sub_dispositions
    WHERE id = p_sub_disposition_id;

    IF v_sub_disp_name IS NULL THEN
      RAISE EXCEPTION 'Sub-disposition % does not exist', p_sub_disposition_id;
    END IF;

    IF v_sub_disp_parent IS DISTINCT FROM p_disposition_id THEN
      RAISE EXCEPTION 'Sub-disposition "%" does not belong to disposition "%"', v_sub_disp_name, v_disp.name;
    END IF;
  END IF;

  -- 7. Validate Next Action hierarchy
  IF p_next_action_id IS NOT NULL THEN
    SELECT name, disposition_id, action_type INTO v_next_act_name, v_next_act_parent, v_task_type
    FROM public.next_actions
    WHERE id = p_next_action_id;

    IF v_next_act_name IS NULL THEN
      RAISE EXCEPTION 'Next action % does not exist', p_next_action_id;
    END IF;

    IF v_next_act_parent IS DISTINCT FROM p_disposition_id THEN
      RAISE EXCEPTION 'Next action "%" does not belong to disposition "%"', v_next_act_name, v_disp.name;
    END IF;

    IF v_task_type IS NULL OR trim(v_task_type) = '' THEN
      v_task_type := 'Call';
    END IF;
  END IF;

  -- 8. Authoritatively derive target status directly from disposition configuration
  -- Client cannot forge or override target_status independently!
  v_target_status := COALESCE(v_disp.target_status, v_lead.lead_status);

  -- 9. Fetch caller's display name for human-readable audit trail
  SELECT name INTO v_author_name FROM public.users WHERE id = v_caller_id;
  IF v_author_name IS NULL OR trim(v_author_name) = '' THEN
    v_author_name := 'System';
  END IF;

  -- 10. Update Lead record
  UPDATE public.leads
  SET
    latest_disposition_id = p_disposition_id,
    latest_sub_disposition_id = p_sub_disposition_id,
    next_action_date = p_follow_up_at,
    lead_status = v_target_status,
    lost_reason = CASE WHEN v_disp.target_status = 'Rejected' THEN COALESCE(p_lost_reason, lost_reason) ELSE lost_reason END,
    competitor = CASE WHEN v_disp.target_status = 'Rejected' THEN COALESCE(p_competitor, competitor) ELSE competitor END,
    updated_at = NOW()
  WHERE id = p_lead_id;

  -- 11. Insert History Record
  INSERT INTO public.lead_disposition_history (
    lead_id,
    disposition_id,
    sub_disposition_id,
    next_action_id,
    notes,
    follow_up_at,
    previous_status,
    new_status,
    created_by,
    disposition_name,
    sub_disposition_name,
    next_action_name
  ) VALUES (
    p_lead_id,
    p_disposition_id,
    p_sub_disposition_id,
    p_next_action_id,
    p_notes,
    p_follow_up_at,
    v_lead.lead_status,
    v_target_status,
    v_caller_id,
    v_disp.name,
    v_sub_disp_name,
    v_next_act_name
  );

  -- 12. Format and insert into lead_activities
  v_activity_content := 'Disposition: **' || v_disp.name || '**';
  IF v_sub_disp_name IS NOT NULL THEN
    v_activity_content := v_activity_content || E'\nSub-disposition: ' || v_sub_disp_name;
  END IF;
  IF v_next_act_name IS NOT NULL THEN
    v_activity_content := v_activity_content || E'\nNext Action: ' || v_next_act_name;
  END IF;
  IF p_notes IS NOT NULL AND trim(p_notes) != '' THEN
    v_activity_content := v_activity_content || E'\nNotes: ' || p_notes;
  END IF;
  IF p_follow_up_at IS NOT NULL THEN
    v_activity_content := v_activity_content || E'\nFollow-up Scheduled: ' || to_char(p_follow_up_at, 'YYYY-MM-DD HH24:MI');
  END IF;
  IF v_lead.lead_status IS DISTINCT FROM v_target_status THEN
    v_activity_content := v_activity_content || E'\nStatus updated: ' || COALESCE(v_lead.lead_status, 'None') || ' → ' || v_target_status;
  END IF;

  INSERT INTO public.lead_activities (
    lead_id,
    type,
    content,
    author,
    date,
    organization_id,
    previous_value,
    new_value,
    previous_label,
    new_label,
    source
  ) VALUES (
    p_lead_id,
    'disposition_change',
    v_activity_content,
    v_author_name,
    NOW(),
    v_lead.organization_id,
    v_lead.lead_status,
    v_disp.name,
    'Status',
    'Disposition',
    'Manual'
  );

  -- 13. Create Task if Follow-up is Scheduled
  IF p_follow_up_at IS NOT NULL THEN
    v_due_date := (p_follow_up_at AT TIME ZONE 'UTC')::DATE;
    v_due_time := (p_follow_up_at AT TIME ZONE 'UTC')::TIME;

    INSERT INTO public.tasks (
      title,
      description,
      task_type,
      priority,
      status,
      due_date,
      due_time,
      assigned_user,
      created_by,
      lead_id,
      organization_id
    ) VALUES (
      COALESCE(v_next_act_name, 'Follow Up') || ' - ' || v_lead.first_name || ' ' || COALESCE(v_lead.last_name, ''),
      COALESCE(p_notes, 'Follow-up generated from disposition: ' || v_disp.name),
      v_task_type,
      'Medium',
      'Pending',
      v_due_date,
      v_due_time,
      COALESCE(v_lead.assigned_counselor, v_caller_id),
      v_caller_id,
      p_lead_id,
      v_lead.organization_id
    );

    -- Increment tasks_count on lead if function exists
    BEGIN
      PERFORM public.increment_lead_tasks_count(p_lead_id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 14. Return success result
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'disposition_id', p_disposition_id,
    'disposition_name', v_disp.name,
    'previous_status', v_lead.lead_status,
    'new_status', v_target_status
  );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_lead_disposition TO authenticated;

-- ============================================================================
-- 6. STORAGE OBJECTS HARDENING FOR DOCUMENTS BUCKET
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can select objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;

DROP POLICY IF EXISTS "Admins full access to documents storage" ON storage.objects;
CREATE POLICY "Admins full access to documents storage" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'documents' AND (is_admin() OR is_super_admin())
)
WITH CHECK (
  bucket_id = 'documents' AND (is_admin() OR is_super_admin())
);

DROP POLICY IF EXISTS "Users can view authorized lead documents" ON storage.objects;
CREATE POLICY "Users can view authorized lead documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    is_admin() OR is_super_admin()
    OR (
      name ~ '^leads/[0-9a-fA-F-]{36}/'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT leads.id FROM public.leads
        WHERE leads.assigned_counselor = auth.uid()
           OR is_manager_of(leads.assigned_counselor)
           OR leads.partner_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can upload authorized lead documents" ON storage.objects;
CREATE POLICY "Users can upload authorized lead documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    is_admin() OR is_super_admin()
    OR (
      name ~ '^leads/[0-9a-fA-F-]{36}/'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT leads.id FROM public.leads
        WHERE leads.assigned_counselor = auth.uid()
           OR is_manager_of(leads.assigned_counselor)
           OR leads.partner_id = auth.uid()
           OR (user_role() = 'Counselor' AND leads.assigned_counselor IS NULL)
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can delete authorized lead documents" ON storage.objects;
CREATE POLICY "Users can delete authorized lead documents" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND (
    is_admin() OR is_super_admin()
    OR (
      name ~ '^leads/[0-9a-fA-F-]{36}/'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT leads.id FROM public.leads
        WHERE leads.assigned_counselor = auth.uid()
           OR is_manager_of(leads.assigned_counselor)
      )
    )
  )
);


-- Append to migration 163: Fix latent bug in notify_task_events
CREATE OR REPLACE FUNCTION public.notify_task_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    task_org_id UUID;
BEGIN
    task_org_id := NEW.organization_id;
    IF task_org_id IS NULL AND NEW.lead_id IS NOT NULL THEN
        SELECT organization_id INTO task_org_id FROM public.leads WHERE id = NEW.lead_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'task.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
            detected_events := array_append(detected_events, 'task.completed');
        END IF;
        IF NEW.status = 'Overdue' AND (OLD.status IS NULL OR OLD.status != 'Overdue') THEN
            detected_events := array_append(detected_events, 'task.overdue');
        END IF;
    END IF;

    IF array_length(detected_events, 1) IS NOT NULL AND task_org_id IS NOT NULL THEN
        FOREACH evt IN ARRAY detected_events
        LOOP
            payload := jsonb_build_object(
                'event', evt,
                'task_id', NEW.id,
                'title', NEW.title,
                'description', COALESCE(NEW.description, ''),
                'task_type', NEW.task_type,
                'priority', NEW.priority,
                'status', NEW.status,
                'due_date', NEW.due_date,
                'assigned_user', NEW.assigned_user,
                'lead_id', NEW.lead_id
            );

            BEGIN
                FOR webhook IN 
                    SELECT url, secret 
                    FROM public.webhooks 
                    WHERE organization_id = task_org_id 
                    AND status = 'Active' 
                    AND evt = ANY(events)
                LOOP
                    PERFORM net.http_post(
                        url := webhook.url,
                        body := payload,
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'X-Edvix-Signature', encode(extensions.hmac(payload::text::bytea, webhook.secret::bytea, 'sha256'), 'hex')
                        )
                    );
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;
