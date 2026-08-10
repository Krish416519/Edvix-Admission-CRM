-- 00000000000069_automation_dispatcher.sql
-- Updates webhook triggers to also dispatch events to the internal Automation Edge Function

-- We will recreate the notify_lead_events function to also ping the internal automation runner
CREATE OR REPLACE FUNCTION public.notify_lead_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    automation_url TEXT;
BEGIN
    -- Detect lead.created
    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'lead.created');
    END IF;

    -- Detect updates
    IF TG_OP = 'UPDATE' THEN
        IF NEW.counselor_id IS NOT NULL AND OLD.counselor_id IS NULL THEN
            detected_events := array_append(detected_events, 'lead.assigned');
        END IF;

        IF NEW.status = 'Qualified' AND (OLD.status IS NULL OR OLD.status != 'Qualified') THEN
            detected_events := array_append(detected_events, 'lead.qualified');
        END IF;

        IF (NEW.status = 'Lost' OR NEW.status = 'Dropped') AND (OLD.status IS NULL OR (OLD.status != 'Lost' AND OLD.status != 'Dropped')) THEN
            detected_events := array_append(detected_events, 'lead.lost');
        END IF;

        IF NEW.status = 'Converted' AND (OLD.status IS NULL OR OLD.status != 'Converted') THEN
            detected_events := array_append(detected_events, 'lead.converted');
        END IF;

        IF array_length(detected_events, 1) IS NULL THEN
            detected_events := array_append(detected_events, 'lead.updated');
        END IF;
    END IF;

    -- Get Automation Runner URL (defaults to local docker if not set)
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
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'course', NEW.course,
            'university', (SELECT name FROM public.universities WHERE id = NEW.university_id),
            'status', NEW.status
        );

        -- 1. External Webhooks
        FOR webhook IN 
            SELECT url, secret 
            FROM public.webhooks 
            WHERE organization_id = NEW.organization_id 
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

        -- 2. Internal Automation Runner
        PERFORM net.http_post(
            url := automation_url,
            body := payload,
            headers := jsonb_build_object('Content-Type', 'application/json')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
