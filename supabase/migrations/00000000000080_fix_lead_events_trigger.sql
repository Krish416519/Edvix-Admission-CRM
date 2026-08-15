-- 00000000000080_fix_lead_events_trigger.sql

CREATE OR REPLACE FUNCTION public.notify_lead_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    automation_url TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'lead.created');
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS NOT NULL AND OLD.assigned_counselor IS NULL THEN
            detected_events := array_append(detected_events, 'lead.assigned');
        END IF;
        IF NEW.lead_status = 'Qualified' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Qualified') THEN
            detected_events := array_append(detected_events, 'lead.qualified');
        END IF;
        IF (NEW.lead_status = 'Lost' OR NEW.lead_status = 'Dropped') AND (OLD.lead_status IS NULL OR (OLD.lead_status != 'Lost' AND OLD.lead_status != 'Dropped')) THEN
            detected_events := array_append(detected_events, 'lead.lost');
        END IF;
        IF NEW.lead_status = 'Converted' AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Converted') THEN
            detected_events := array_append(detected_events, 'lead.converted');
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
            PERFORM public.dispatch_webhook(NEW.organization_id, webhook.id, webhook.url, webhook.secret, evt, payload);
        END LOOP;

        PERFORM net.http_post(
            url := automation_url,
            body := payload,
            headers := jsonb_build_object('Content-Type', 'application/json')
        );
    END LOOP;

    RETURN NEW;
END;
$function$;
