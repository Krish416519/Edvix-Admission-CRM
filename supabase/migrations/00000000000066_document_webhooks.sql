-- 00000000000066_document_webhooks.sql

CREATE OR REPLACE FUNCTION public.notify_document_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    doc_org_id UUID;
BEGIN
    -- Determine the organization_id from the parent lead or admission
    IF NEW.lead_id IS NOT NULL THEN
        SELECT organization_id INTO doc_org_id FROM public.leads WHERE id = NEW.lead_id;
    ELSIF NEW.admission_id IS NOT NULL THEN
        SELECT l.organization_id INTO doc_org_id 
        FROM public.admissions a
        JOIN public.leads l ON a.lead_id = l.id
        WHERE a.id = NEW.admission_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'document.uploaded');
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Verified' AND (OLD.status IS NULL OR OLD.status != 'Verified') THEN
            detected_events := array_append(detected_events, 'document.verified');
        END IF;
        IF NEW.status = 'Rejected' AND (OLD.status IS NULL OR OLD.status != 'Rejected') THEN
            detected_events := array_append(detected_events, 'document.rejected');
        END IF;
        IF NEW.status = 'Missing' AND (OLD.status IS NULL OR OLD.status != 'Missing') THEN
            detected_events := array_append(detected_events, 'document.missing');
        END IF;
    END IF;

    IF array_length(detected_events, 1) IS NOT NULL AND doc_org_id IS NOT NULL THEN
        FOREACH evt IN ARRAY detected_events
        LOOP
            payload := jsonb_build_object(
                'event', evt,
                'document_id', NEW.id,
                'lead_id', NEW.lead_id,
                'admission_id', NEW.admission_id,
                'name', NEW.name,
                'type', NEW.type,
                'status', NEW.status,
                'url', COALESCE(NEW.url, ''),
                'remarks', COALESCE(NEW.remarks, '')
            );

            FOR webhook IN 
                SELECT url, secret 
                FROM public.webhooks 
                WHERE organization_id = doc_org_id 
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_document_events ON public.documents;

CREATE TRIGGER trg_notify_document_events
    AFTER INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_document_events();
