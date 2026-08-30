-- =============================================================================
-- 00000000000133_lead_assignment_notification_metadata_fix.sql
-- Fix: Lead assignment notifications must include metadata.link for click routing.
--      The original assign_lead function (migration 121) created notifications
--      without metadata, causing click routing to rely solely on fallback logic.
--      This recreates assign_lead with metadata.link set to the lead's URL.
-- =============================================================================

-- Drop and recreate the assign_lead function with metadata.link
DROP FUNCTION IF EXISTS public.assign_lead(
  p_lead_id UUID,
  p_assignee_id UUID,
  p_assigned_by UUID,
  p_notes TEXT,
  p_assignment_type VARCHAR
);

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

  -- Create in-app notification for the new assignee with metadata.link for click routing
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
$$;

-- Re-grant execute to authenticated users (RLS on lead_assignments handles who can call it)
GRANT EXECUTE ON FUNCTION public.assign_lead TO authenticated;
