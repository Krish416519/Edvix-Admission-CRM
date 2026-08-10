-- 00000000000065_admission_webhooks.sql

CREATE OR REPLACE FUNCTION public.notify_admission_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    uni_name VARCHAR;
BEGIN
    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'admission.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.stage = 'Submitted' AND (OLD.stage IS NULL OR OLD.stage != 'Submitted') THEN
            detected_events := array_append(detected_events, 'admission.submitted');
        END IF;
        IF NEW.stage = 'Approved' AND (OLD.stage IS NULL OR OLD.stage != 'Approved') THEN
            detected_events := array_append(detected_events, 'admission.approved');
        END IF;
        IF (NEW.stage = 'Rejected' OR NEW.stage = 'Declined') AND (OLD.stage IS NULL OR (OLD.stage != 'Rejected' AND OLD.stage != 'Declined')) THEN
            detected_events := array_append(detected_events, 'admission.rejected');
        END IF;
        IF NEW.stage = 'Confirmed' AND (OLD.stage IS NULL OR OLD.stage != 'Confirmed') THEN
            detected_events := array_append(detected_events, 'admission.confirmed');
        END IF;
    END IF;

    -- If we detected events, construct payload and send
    IF array_length(detected_events, 1) IS NOT NULL THEN
        
        IF NEW.university_id IS NOT NULL THEN
            SELECT name INTO uni_name FROM public.universities WHERE id = NEW.university_id;
        END IF;

        FOREACH evt IN ARRAY detected_events
        LOOP
            payload := jsonb_build_object(
                'event', evt,
                'student_id', COALESCE(NEW.student_id, ''),
                'application_id', COALESCE(NEW.application_id, ''),
                'university', COALESCE(uni_name, '')
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup the old specific trigger and replace it with the generic one
DROP TRIGGER IF EXISTS trg_notify_admission_confirmed ON public.admissions;
DROP TRIGGER IF EXISTS trg_notify_admission_events ON public.admissions;

CREATE TRIGGER trg_notify_admission_events
    AFTER INSERT OR UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admission_events();
