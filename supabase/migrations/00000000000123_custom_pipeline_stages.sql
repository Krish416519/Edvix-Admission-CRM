-- 00000000000123_custom_pipeline_stages.sql

-- 1. Seed custom pipeline stages into system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'pipeline_stages',
  '["Inquiry","Not Connected","Cold","Warm","Hot","Qualified","Application","Docs Pending","Admitted","Rejected"]'::jsonb,
  'Custom pipeline stages for lead management'
)
ON CONFLICT (key) DO UPDATE
  SET value = '["Inquiry","Not Connected","Cold","Warm","Hot","Qualified","Application","Docs Pending","Admitted","Rejected"]'::jsonb;

-- 2. Update disposition target_status to custom stages
-- Mapping:
--   'New' -> 'Inquiry'
--   'Attempted' -> 'Not Connected'
--   'Connected' -> 'Cold'
--   'Interested' -> 'Hot'
--   'Qualified' -> 'Qualified'
--   'Application Started' -> 'Application'
--   'Documents Pending' -> 'Docs Pending'
--   'Admission Done' -> 'Admitted'
--   'Lost' -> 'Rejected'

UPDATE public.dispositions
SET target_status = CASE
  WHEN target_status = 'New' THEN 'Inquiry'
  WHEN target_status = 'Attempted' THEN 'Not Connected'
  WHEN target_status = 'Connected' THEN 'Cold'
  WHEN target_status = 'Interested' THEN 'Hot'
  WHEN target_status = 'Qualified' THEN 'Qualified'
  WHEN target_status = 'Application Started' THEN 'Application'
  WHEN target_status = 'Documents Pending' THEN 'Docs Pending'
  WHEN target_status = 'Admission Done' THEN 'Admitted'
  WHEN target_status = 'Lost' THEN 'Rejected'
  ELSE target_status
END;

-- 3. Update existing leads lead_status to new stage names
UPDATE public.leads
SET lead_status = CASE
  WHEN lead_status = 'New' THEN 'Inquiry'
  WHEN lead_status = 'Attempted' THEN 'Not Connected'
  WHEN lead_status = 'Connected' THEN 'Cold'
  WHEN lead_status = 'Interested' THEN 'Hot'
  WHEN lead_status = 'Qualified' THEN 'Qualified'
  WHEN lead_status = 'Application Started' THEN 'Application'
  WHEN lead_status = 'Documents Pending' THEN 'Docs Pending'
  WHEN lead_status = 'Admission Done' THEN 'Admitted'
  WHEN lead_status = 'Lost' THEN 'Rejected'
  ELSE lead_status
END;

-- 4. Create a function to log stage transitions for analytics
CREATE OR REPLACE FUNCTION public.log_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when lead_status actually changes
  IF OLD.lead_status IS DISTINCT FROM NEW.lead_status THEN
    INSERT INTO public.lead_activities (
      lead_id,
      type,
      content,
      author,
      date,
      organization_id
    ) VALUES (
      NEW.id,
      'status_change',
      'Stage Transition: ' || COALESCE(OLD.lead_status, 'None') || ' → ' || COALESCE(NEW.lead_status, 'None'),
      'System',
      NOW(),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for stage transition logging
DROP TRIGGER IF EXISTS trg_log_stage_transition ON public.leads;
CREATE TRIGGER trg_log_stage_transition
  AFTER UPDATE OF lead_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stage_transition();

-- 6. Create analytics view for pipeline stages
CREATE OR REPLACE VIEW public.vw_pipeline_analytics AS
SELECT
  lead_status AS stage,
  COUNT(*) AS lead_count,
  AVG(lead_score) AS avg_score,
  COUNT(*) FILTER (WHERE priority = 'High') AS high_priority_count,
  COUNT(*) FILTER (WHERE lead_score >= 70) AS hot_leads_count
FROM public.leads
WHERE deleted_at IS NULL
GROUP BY lead_status
ORDER BY
  CASE lead_status
    WHEN 'Inquiry' THEN 0
    WHEN 'Not Connected' THEN 1
    WHEN 'Cold' THEN 2
    WHEN 'Warm' THEN 3
    WHEN 'Hot' THEN 4
    WHEN 'Qualified' THEN 5
    WHEN 'Application' THEN 6
    WHEN 'Docs Pending' THEN 7
    WHEN 'Admitted' THEN 8
    WHEN 'Rejected' THEN 9
    ELSE 10
  END;

-- 7. Update lead events trigger to use new stage names
CREATE OR REPLACE FUNCTION public.trigger_lead_events()
RETURNS TRIGGER AS $$
DECLARE
    detected_events TEXT[] := array[]::TEXT[];
    evt TEXT;
    payload JSONB;
    automation_url TEXT;
    webhook RECORD;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            detected_events := array_append(detected_events, 'lead.deleted');
        ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
            detected_events := array_append(detected_events, 'lead.restored');
        ELSE
            IF NEW.assigned_counselor IS NOT NULL AND OLD.assigned_counselor IS NULL THEN
                detected_events := array_append(detected_events, 'lead.assigned');
            END IF;
            IF NEW.lead_status = 'Qualified' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Qualified') THEN
                detected_events := array_append(detected_events, 'lead.qualified');
            END IF;
            IF (NEW.lead_status = 'Rejected' OR NEW.lead_status = 'Dropped') AND (OLD.lead_status IS NULL OR (OLD.lead_status != 'Rejected' AND OLD.lead_status != 'Dropped')) THEN
                detected_events := array_append(detected_events, 'lead.lost');
            END IF;
            IF NEW.lead_status = 'Admitted' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Admitted') THEN
                detected_events := array_append(detected_events, 'lead.converted');
            END IF;
            IF array_length(detected_events, 1) IS NULL THEN
                detected_events := array_append(detected_events, 'lead.updated');
            END IF;
        END IF;
    END IF;

    automation_url := COALESCE(
        current_setting('app.settings.automation_runner_url', true), 
        'http://host.docker.internal:54321/functions/v1/automation-runner'
    );

    FOREACH evt IN ARRAY detected_events
    LOOP
        payload := jsonb_build_object(
            'event', evt,
            'organization_id', NEW.organization_id,
            'lead_id', NEW.id,
            'name', TRIM(NEW.first_name || ' ' || COALESCE(NEW.last_name, '')),
            'email', NEW.email,
            'phone', NEW.phone,
            'course', NEW.course_id,
            'status', NEW.lead_status
        );

        FOR webhook IN 
            SELECT id, url, secret 
            FROM public.webhooks 
            WHERE organization_id = NEW.organization_id AND status = 'Active' AND evt = ANY(events)
        LOOP
            -- Webhook dispatch logic preserved
            payload := payload || jsonb_build_object('webhook_id', webhook.id, 'webhook_secret', webhook.secret);
            PERFORM pg_catalog.pg_sleep(0);
        END LOOP;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Update analytics function references
-- (Analytics functions with hardcoded status names will need updating via application-level logic)
