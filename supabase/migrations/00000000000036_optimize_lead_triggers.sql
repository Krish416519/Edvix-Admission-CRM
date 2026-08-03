-- Optimize the lead activity trigger to prevent massive slowdowns during bulk operations
-- We replace the O(N) database lookup with an O(1) JWT claim extraction

CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
  author_name VARCHAR;
  activity_type VARCHAR;
  activity_content TEXT;
BEGIN
  -- Get author name safely and FAST from JWT to avoid O(N) queries during bulk operations
  BEGIN
    author_name := NULLIF(
      (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'name'), 
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    author_name := NULL;
  END;
  
  IF author_name IS NULL THEN
    author_name := 'System';
  END IF;

  -- Determine activity type and content
  IF TG_OP = 'INSERT' THEN
    activity_type := 'lead_created';
    activity_content := 'Lead was created in the system.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      activity_type := 'status_change';
      activity_content := 'Lead was deleted (soft delete).';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      activity_type := 'status_change';
      activity_content := 'Lead was restored.';
    ELSIF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
      activity_type := 'status_change';
      activity_content := 'Lead counselor was changed.';
    ELSIF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
      activity_type := 'status_change';
      activity_content := 'Lead status changed from ' || COALESCE(OLD.lead_status, 'Unknown') || ' to ' || COALESCE(NEW.lead_status, 'Unknown');
    ELSE
      activity_type := 'status_change';
      activity_content := 'Lead information was updated.';
    END IF;
  ELSE
    -- DELETE or unknown - skip logging
    RETURN NEW;
  END IF;

  -- Insert activity log with explicit RLS bypass
  BEGIN
    INSERT INTO public.lead_activities (lead_id, type, content, author, created_by)
    VALUES (NEW.id, activity_type, activity_content, author_name, auth.uid());
  EXCEPTION WHEN OTHERS THEN
    -- Never let activity logging fail the main lead transaction
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also optimize bulk_assign_leads to execute as true bulk statements instead of a row-by-row loop

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
  v_new_assignee_name TEXT;
  v_assigner_name TEXT;
BEGIN
  -- Resolve assigner and assignee names ONCE (O(1)) instead of inside a loop (O(N))
  SELECT name INTO v_new_assignee_name FROM public.users WHERE id = p_assignee_id;
  SELECT name INTO v_assigner_name FROM public.users WHERE id = p_assigned_by;
  
  -- Deactivate all existing active assignments for these leads
  UPDATE public.lead_assignments
  SET is_active = FALSE, updated_at = now()
  WHERE lead_id = ANY(p_lead_ids) AND is_active = TRUE;

  -- Insert new assignment records for all leads in one bulk query
  INSERT INTO public.lead_assignments (lead_id, assignee_id, assigned_by, previous_assignee_id, assignment_type, notes, is_active)
  SELECT 
    l.id, 
    p_assignee_id, 
    p_assigned_by, 
    l.assigned_counselor, 
    'Bulk', 
    p_notes, 
    TRUE
  FROM public.leads l
  WHERE l.id = ANY(p_lead_ids);

  -- Update leads table (this will fire the optimized log_lead_activity trigger and notifications)
  UPDATE public.leads
  SET assigned_counselor = p_assignee_id, updated_at = now()
  WHERE id = ANY(p_lead_ids);

  RETURN jsonb_build_object('success', true, 'total', array_length(p_lead_ids, 1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
