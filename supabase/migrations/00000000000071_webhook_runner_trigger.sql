-- 00000000000071_webhook_runner_trigger.sql

-- Helper function to queue delivery and ping edge function
CREATE OR REPLACE FUNCTION public.dispatch_webhook(
    p_organization_id UUID,
    p_webhook_id UUID,
    p_url TEXT,
    p_secret TEXT,
    p_event TEXT,
    p_payload JSONB
) RETURNS VOID AS $$
DECLARE
    v_delivery_id UUID;
    v_runner_url TEXT;
BEGIN
    INSERT INTO public.webhook_deliveries (
        organization_id, webhook_id, event, url, request_payload, status
    ) VALUES (
        p_organization_id, p_webhook_id, p_event, p_url, p_payload, 'Pending'
    ) RETURNING id INTO v_delivery_id;

    v_runner_url := COALESCE(
        current_setting('app.settings.webhook_runner_url', true), 
        'http://host.docker.internal:54321/functions/v1/webhook-runner'
    );

    PERFORM net.http_post(
        url := v_runner_url,
        body := jsonb_build_object(
            'delivery_id', v_delivery_id,
            'url', p_url,
            'secret', p_secret,
            'payload', p_payload
        ),
        headers := jsonb_build_object('Content-Type', 'application/json')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate notify_lead_events
CREATE OR REPLACE FUNCTION public.notify_lead_events()
RETURNS TRIGGER AS $$
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
            'status', NEW.status
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate notify_admission_confirmed
CREATE OR REPLACE FUNCTION public.notify_admission_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
BEGIN
    IF NEW.current_stage = 'Confirmed' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Confirmed') THEN
        payload := jsonb_build_object(
            'event', 'admission.confirmed',
            'data', jsonb_build_object('admission_id', NEW.id, 'status', NEW.current_stage),
            'timestamp', NOW()
        );

        FOR webhook IN 
            SELECT id, url, secret 
            FROM public.webhooks 
            WHERE organization_id = NEW.organization_id AND status = 'Active' AND 'admission.confirmed' = ANY(events)
        LOOP
            PERFORM public.dispatch_webhook(NEW.organization_id, webhook.id, webhook.url, webhook.secret, 'admission.confirmed', payload);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
