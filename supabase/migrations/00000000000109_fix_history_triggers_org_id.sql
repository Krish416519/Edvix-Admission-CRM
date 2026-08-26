-- 00000000000109_fix_history_triggers_org_id.sql
-- Fix triggers that log history to explicitly include organization_id 
-- to prevent NOT NULL constraint errors when auto-set trigger fails

-- 1. Fix log_task_history
CREATE OR REPLACE FUNCTION log_task_history()
RETURNS TRIGGER AS $$
DECLARE
  action_type VARCHAR(100);
  current_user_id UUID;
  details JSONB;
BEGIN
  current_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'Task Created';
    details := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    
    -- Ensure organization_id is included
    INSERT INTO public.task_history (task_id, type, user_id, details, organization_id)
    VALUES (NEW.id, action_type, current_user_id, details, NEW.organization_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      action_type := 'Task Deleted';
      details := '{}'::jsonb;
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      action_type := 'Task Restored';
      details := '{}'::jsonb;
    ELSIF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
      action_type := 'Task Completed';
      details := '{}'::jsonb;
    ELSIF NEW.assigned_user IS DISTINCT FROM OLD.assigned_user THEN
      action_type := 'Task Assigned';
      details := jsonb_build_object('old_user', OLD.assigned_user, 'new_user', NEW.assigned_user);
    ELSE
      -- Don't log every minor update
      RETURN NEW;
    END IF;

    INSERT INTO public.task_history (task_id, type, user_id, details, organization_id)
    VALUES (NEW.id, action_type, current_user_id, details, NEW.organization_id);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix log_lead_activity (if it exists and is used)
CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
    lead_name TEXT;
BEGIN
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
        'Unknown'
    );

    IF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
            INSERT INTO public.lead_activities (lead_id, type, content, author, date, organization_id)
            VALUES (
                NEW.id,
                'status_change',
                'Status changed from ' || COALESCE(OLD.lead_status, 'None') || ' to ' || NEW.lead_status,
                'System',
                NOW(),
                NEW.organization_id
            );
        END IF;

        -- Log assignment changes
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
            INSERT INTO public.lead_activities (lead_id, type, content, author, date, organization_id)
            VALUES (
                NEW.id,
                'assignment',
                'Lead reassigned',
                'System',
                NOW(),
                NEW.organization_id
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never break lead save due to activity logging failure
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
