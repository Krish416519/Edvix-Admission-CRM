-- =============================================================================
-- 00000000000116_fix_assignment_notifications.sql
-- Fix Lead Assignment Notifications (Removes duplicate triggers, fixes casing, obeys matrix)
-- =============================================================================

--------------------------------------------------
-- STEP 1: FIX RPC `assign_lead`
--------------------------------------------------
-- Removes manual notification insert to prevent "leads" (lowercase) casing bug and reassignment spam
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
  
    -- NOTIFICATION BLOCK REMOVED: Handled centrally by notify_lead_changes trigger to respect Intelligent Matrix
  
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

--------------------------------------------------
-- STEP 2: FIX TRIGGER `notify_lead_changes`
--------------------------------------------------
DROP TRIGGER IF EXISTS trg_notify_lead_changes ON public.leads;

CREATE OR REPLACE FUNCTION public.notify_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
    lead_name TEXT;
BEGIN
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')), ''),
        'Unknown'
    );

    IF TG_OP = 'INSERT' THEN
        -- Priority 1: New Lead Assigned at creation
        IF NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'New Lead Assigned',
                    'Lead ' || lead_name || ' has been assigned to you.',
                    'general', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Priority 1: Lead Assigned for the FIRST time
        -- Does NOT notify on reassignment to obey Anti-Fatigue Matrix
        IF OLD.assigned_counselor IS NULL AND NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'New Lead Assigned',
                    'Lead ' || lead_name || ' has been assigned to you.',
                    'general', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    -- Never break the lead save due to notification failures
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reattach trigger
CREATE TRIGGER trg_notify_lead_changes
    AFTER INSERT OR UPDATE
    ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_changes();

--------------------------------------------------
-- STEP 3: DATA CLEANUP
--------------------------------------------------
-- Fix the broken lowercase module records
UPDATE public.notifications SET module = 'Leads' WHERE module = 'leads';
