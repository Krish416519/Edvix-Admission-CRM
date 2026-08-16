-- 00000000000088_fix_lead_trigger_column_names.sql
-- FIX: Update all trigger functions that reference old column names
-- The leads table had columns renamed:
--   name          → first_name (+ last_name)
--   status        → lead_status
--   source        → lead_source
--   counselor_id  → assigned_counselor
--
-- Any trigger function reading NEW.name / NEW.status / NEW.counselor_id will throw:
--   "record new has no field name/status/counselor_id"

-- ── 1. Fix notify_lead_events (from migration 64 + 71) ──────────────────────
CREATE OR REPLACE FUNCTION public.notify_lead_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook    RECORD;
    payload    JSONB;
    detected_events TEXT[] := '{}';
    evt        TEXT;
    automation_url TEXT;
    lead_name  TEXT;
BEGIN
    -- Build display name from renamed columns
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')), ''),
        'Unknown'
    );

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'lead.created');
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- assigned_counselor (was counselor_id)
        IF NEW.assigned_counselor IS NOT NULL AND OLD.assigned_counselor IS NULL THEN
            detected_events := array_append(detected_events, 'lead.assigned');
        END IF;
        -- lead_status (was status)
        IF NEW.lead_status = 'Qualified' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Qualified') THEN
            detected_events := array_append(detected_events, 'lead.qualified');
        END IF;
        IF (NEW.lead_status = 'Lost' OR NEW.lead_status = 'Dropped') AND
           (OLD.lead_status IS NULL OR (OLD.lead_status != 'Lost' AND OLD.lead_status != 'Dropped')) THEN
            detected_events := array_append(detected_events, 'lead.lost');
        END IF;
        IF NEW.lead_status = 'Converted' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Converted') THEN
            detected_events := array_append(detected_events, 'lead.converted');
        END IF;
        IF NEW.lead_status = 'Admission Done' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Admission Done') THEN
            detected_events := array_append(detected_events, 'lead.admitted');
        END IF;
        IF array_length(detected_events, 1) IS NULL THEN
            detected_events := array_append(detected_events, 'lead.updated');
        END IF;
    END IF;

    automation_url := COALESCE(
        current_setting('app.settings.automation_runner_url', true),
        'http://host.docker.internal:54321/functions/v1/automation-runner'
    );

    FOREACH evt IN ARRAY detected_events
    LOOP
        payload := jsonb_build_object(
            'event',           evt,
            'organization_id', NEW.organization_id,
            'lead_id',         NEW.id,
            'lead_number',     NEW.lead_number,
            'name',            lead_name,
            'email',           NEW.email,
            'phone',           NEW.phone,
            'course',          NEW.course,
            'lead_source',     NEW.lead_source,
            'campaign',        NEW.campaign,
            'city',            NEW.city,
            'state',           NEW.state,
            'lead_status',     NEW.lead_status,
            'counselor_id',    NEW.assigned_counselor,
            'timestamp',       NOW()
        );

        -- Dispatch to registered outbound webhooks
        FOR webhook IN
            SELECT id, url, secret
            FROM public.webhooks
            WHERE organization_id = NEW.organization_id
              AND status = 'Active'
              AND evt = ANY(events)
        LOOP
            BEGIN
                PERFORM public.dispatch_webhook(
                    NEW.organization_id, webhook.id, webhook.url, webhook.secret, evt, payload
                );
            EXCEPTION WHEN OTHERS THEN
                -- Never let webhook dispatch break the lead save
                NULL;
            END;
        END LOOP;

        -- Ping automation runner
        BEGIN
            PERFORM net.http_post(
                url     := automation_url,
                body    := payload,
                headers := jsonb_build_object('Content-Type', 'application/json')
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. Fix notify_lead_events for the automation dispatcher (migration 69) ────
-- The 071 migration already recreated this function. The 069 version is now
-- superseded by the function above; the trigger from 071 is the active one.
-- Drop and recreate the trigger to ensure it points to the fixed version.
DROP TRIGGER IF EXISTS trg_notify_lead_events ON public.leads;
DROP TRIGGER IF EXISTS leads_notify_events     ON public.leads;

CREATE TRIGGER trg_notify_lead_events
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_events();


-- ── 3. Fix log_lead_activity trigger (migration 36) ─────────────────────────
-- This trigger also likely references OLD/NEW.name, NEW.status, NEW.counselor_id
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
            INSERT INTO public.lead_activities (lead_id, type, content, author, date)
            VALUES (
                NEW.id,
                'status_change',
                'Status changed from ' || COALESCE(OLD.lead_status, 'None') || ' to ' || NEW.lead_status,
                'System',
                NOW()
            );
        END IF;

        -- Log assignment changes
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
            INSERT INTO public.lead_activities (lead_id, type, content, author, date)
            VALUES (
                NEW.id,
                'assignment',
                'Lead reassigned',
                'System',
                NOW()
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never break lead save due to activity logging failure
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure this trigger is attached (it may already exist from migration 36)
DROP TRIGGER IF EXISTS trg_log_lead_activity ON public.leads;
CREATE TRIGGER trg_log_lead_activity
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION log_lead_activity();
