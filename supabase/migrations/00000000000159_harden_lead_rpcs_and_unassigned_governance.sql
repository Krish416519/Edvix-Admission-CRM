-- ====================================================================
-- MIGRATION 159: HARDEN LEAD RPCS & AUTHORIZATION GOVERNANCE
-- Closes direct RPC authorization bypasses on bulk operations & assignments.
-- Enforces data-scope and permission checks inside SECURITY DEFINER functions.
-- ====================================================================

-- 1. Hardened assign_lead RPC
CREATE OR REPLACE FUNCTION public.assign_lead(
    p_lead_id uuid, 
    p_assignee_id uuid, 
    p_assigned_by uuid DEFAULT NULL, 
    p_notes text DEFAULT NULL::text, 
    p_assignment_type character varying DEFAULT 'Manual'::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id         UUID := auth.uid();
  v_previous_assignee UUID;
  v_previous_name     TEXT;
  v_new_assignee_name TEXT;
  v_assigner_name     TEXT;
  v_lead_name         TEXT;
  v_assignment_id     UUID;
  v_effective_by      UUID;
  v_is_admin          BOOLEAN;
  v_has_assign_perm   BOOLEAN;
BEGIN
  -- If executed by authenticated caller, force assigner to caller
  IF v_caller_id IS NOT NULL THEN
    v_effective_by := v_caller_id;
  ELSE
    v_effective_by := COALESCE(p_assigned_by, '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;

  v_is_admin := public.is_super_admin();
  v_has_assign_perm := public.has_permission('Assign Leads', 'Lead Management') OR public.has_permission('Reassign Leads', 'Lead Management');

  -- Get current assignee from leads table
  SELECT assigned_counselor, first_name || ' ' || COALESCE(last_name, '')
  INTO v_previous_assignee, v_lead_name
  FROM public.leads WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Authorization Gate:
  -- Admin or user with Assign Leads permission can assign any lead
  -- Manager can assign if manager of target or lead
  -- Counselor can ONLY claim unassigned lead to self
  IF NOT v_is_admin AND NOT v_has_assign_perm THEN
    IF v_previous_assignee IS NOT NULL AND v_previous_assignee != v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Cannot reassign another counselor''s lead');
    END IF;
    IF p_assignee_id != v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Counselors can only claim leads for themselves');
    END IF;
  END IF;

  -- Resolve names for logging
  SELECT name INTO v_previous_name FROM public.users WHERE id = v_previous_assignee;
  SELECT name INTO v_new_assignee_name FROM public.users WHERE id = p_assignee_id;
  SELECT name INTO v_assigner_name FROM public.users WHERE id = v_effective_by;

  -- Deactivate all existing active assignments for this lead
  UPDATE public.lead_assignments
  SET is_active = FALSE, updated_at = now()
  WHERE lead_id = p_lead_id AND is_active = TRUE;

  -- Insert new assignment record
  INSERT INTO public.lead_assignments (lead_id, assignee_id, assigned_by, previous_assignee_id, assignment_type, notes, is_active)
  VALUES (p_lead_id, p_assignee_id, v_effective_by, v_previous_assignee, p_assignment_type, p_notes, TRUE)
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
  INSERT INTO public.notifications (recipient_id, module, module_record_id, title, message, channel, priority, category, status, metadata)
  VALUES (
    p_assignee_id,
    'leads',
    p_lead_id,
    'New Lead Assigned',
    'You have been assigned lead: ' || TRIM(v_lead_name) || ' by ' || COALESCE(v_assigner_name, 'Admin'),
    'In-App',
    'High',
    'Assignment',
    'Unread',
    jsonb_build_object('link', '/all-leads/' || p_lead_id::text)
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
$function$;

-- 2. Hardened bulk_assign_leads RPC
CREATE OR REPLACE FUNCTION public.bulk_assign_leads(
    p_lead_ids uuid[], 
    p_assignee_id uuid, 
    p_assigned_by uuid DEFAULT NULL, 
    p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lead_id UUID;
  v_results JSONB := '[]'::JSONB;
  v_result  JSONB;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_has_assign_perm BOOLEAN;
BEGIN
  v_is_admin := public.is_super_admin();
  v_has_assign_perm := public.has_permission('Assign Leads', 'Lead Management') OR public.has_permission('Reassign Leads', 'Lead Management');

  IF NOT v_is_admin AND NOT v_has_assign_perm THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not have permission to perform bulk lead assignment.');
  END IF;

  FOREACH v_lead_id IN ARRAY p_lead_ids LOOP
    v_result := public.assign_lead(v_lead_id, p_assignee_id, v_caller_id, p_notes, 'Bulk');
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'results', v_results, 'total', array_length(p_lead_ids, 1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 3. Hardened bulk_delete_leads RPC
CREATE OR REPLACE FUNCTION public.bulk_delete_leads(p_lead_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_has_delete_perm BOOLEAN;
  v_affected INT;
BEGIN
  v_is_admin := public.is_super_admin();
  v_has_delete_perm := public.has_permission('Delete Leads', 'Lead Management') OR public.has_permission('Bulk Delete Leads', 'Lead Management');

  IF NOT v_is_admin AND NOT v_has_delete_perm THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not have permission to delete leads.');
  END IF;

  IF v_is_admin THEN
    UPDATE public.leads
    SET deleted_at = now(), updated_at = now()
    WHERE id = ANY(p_lead_ids);
  ELSE
    UPDATE public.leads
    SET deleted_at = now(), updated_at = now()
    WHERE id = ANY(p_lead_ids)
      AND (assigned_counselor = v_caller_id OR public.is_manager_of(assigned_counselor));
  END IF;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'total', v_affected);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 4. Hardened bulk_update_leads RPC
CREATE OR REPLACE FUNCTION public.bulk_update_leads(
    p_lead_ids uuid[], 
    p_status text DEFAULT NULL::text, 
    p_priority text DEFAULT NULL::text, 
    p_source text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_has_edit_perm BOOLEAN;
  v_affected INT;
BEGIN
  v_is_admin := public.is_super_admin();
  v_has_edit_perm := public.has_permission('Edit Leads', 'Lead Management') OR public.has_permission('Bulk Update Leads', 'Lead Management');

  IF NOT v_is_admin AND NOT v_has_edit_perm THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not have permission to bulk update leads.');
  END IF;

  IF v_is_admin THEN
    UPDATE public.leads
    SET 
      lead_status = COALESCE(p_status, lead_status),
      priority = COALESCE(p_priority, priority),
      lead_source = COALESCE(p_source, lead_source),
      updated_at = now()
    WHERE id = ANY(p_lead_ids);
  ELSE
    UPDATE public.leads
    SET 
      lead_status = COALESCE(p_status, lead_status),
      priority = COALESCE(p_priority, priority),
      lead_source = COALESCE(p_source, lead_source),
      updated_at = now()
    WHERE id = ANY(p_lead_ids)
      AND (assigned_counselor = v_caller_id OR public.is_manager_of(assigned_counselor) OR assigned_counselor IS NULL);
  END IF;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'total', v_affected);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

NOTIFY pgrst, 'reload schema';
