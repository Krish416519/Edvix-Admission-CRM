-- 00000000000067_payment_webhooks.sql

CREATE OR REPLACE FUNCTION public.notify_payment_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    pmt_org_id UUID;
BEGIN
    -- Determine the organization_id from the parent lead or admission
    IF NEW.lead_id IS NOT NULL THEN
        SELECT organization_id INTO pmt_org_id FROM public.leads WHERE id = NEW.lead_id;
    ELSIF NEW.admission_id IS NOT NULL THEN
        SELECT l.organization_id INTO pmt_org_id 
        FROM public.admissions a
        JOIN public.leads l ON a.lead_id = l.id
        WHERE a.id = NEW.admission_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'payment.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Paid' AND (OLD.status IS NULL OR OLD.status != 'Paid') THEN
            detected_events := array_append(detected_events, 'payment.success');
        END IF;
        IF NEW.status = 'Failed' AND (OLD.status IS NULL OR OLD.status != 'Failed') THEN
            detected_events := array_append(detected_events, 'payment.failed');
        END IF;
        IF NEW.status = 'Refunded' AND (OLD.status IS NULL OR OLD.status != 'Refunded') THEN
            detected_events := array_append(detected_events, 'payment.refunded');
        END IF;
    END IF;

    IF array_length(detected_events, 1) IS NOT NULL AND pmt_org_id IS NOT NULL THEN
        FOREACH evt IN ARRAY detected_events
        LOOP
            payload := jsonb_build_object(
                'event', evt,
                'payment_id', NEW.id,
                'payment_number', NEW.payment_number,
                'lead_id', NEW.lead_id,
                'admission_id', NEW.admission_id,
                'amount', NEW.amount,
                'net_amount', NEW.net_amount,
                'payment_method', NEW.payment_method,
                'transaction_id', COALESCE(NEW.transaction_id, ''),
                'status', NEW.status,
                'remarks', COALESCE(NEW.remarks, '')
            );

            FOR webhook IN 
                SELECT url, secret 
                FROM public.webhooks 
                WHERE organization_id = pmt_org_id 
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

DROP TRIGGER IF EXISTS trg_notify_payment_events ON public.payments;

CREATE TRIGGER trg_notify_payment_events
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_payment_events();
