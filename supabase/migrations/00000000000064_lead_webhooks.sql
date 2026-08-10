-- 00000000000064_lead_webhooks.sql

CREATE OR REPLACE FUNCTION public.notify_lead_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'lead.created');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check for specific state changes
        IF NEW.status = 'Qualified' AND (OLD.status IS NULL OR OLD.status != 'Qualified') THEN
            detected_events := array_append(detected_events, 'lead.qualified');
        END IF;
        IF (NEW.status = 'Lost' OR NEW.status = 'Dropped') AND (OLD.status IS NULL OR (OLD.status != 'Lost' AND OLD.status != 'Dropped')) THEN
            detected_events := array_append(detected_events, 'lead.lost');
        END IF;
        IF NEW.status = 'Converted' AND (OLD.status IS NULL OR OLD.status != 'Converted') THEN
            detected_events := array_append(detected_events, 'lead.converted');
        END IF;
        IF NEW.counselor_id IS NOT NULL AND (OLD.counselor_id IS NULL OR NEW.counselor_id != OLD.counselor_id) THEN
            detected_events := array_append(detected_events, 'lead.assigned');
        END IF;
        
        -- If no specific event was detected, we emit lead.updated
        IF array_length(detected_events, 1) IS NULL THEN
            detected_events := array_append(detected_events, 'lead.updated');
        END IF;
    END IF;

    -- For each detected event, find matching webhooks and dispatch
    FOREACH evt IN ARRAY detected_events
    LOOP
        payload := jsonb_build_object(
            'event', evt,
            'lead_id', NEW.id,
            'name', NEW.name,
            'email', NEW.email,
            'phone', NEW.phone,
            'course', NEW.course,
            'source', NEW.source,
            'campaign', NEW.campaign,
            'city', NEW.city,
            'status', NEW.status,
            'counselor_id', NEW.counselor_id
        );

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
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_lead_events ON public.leads;
CREATE TRIGGER trg_notify_lead_events
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_events();
