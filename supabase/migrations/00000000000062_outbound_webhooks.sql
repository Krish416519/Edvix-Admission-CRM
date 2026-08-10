-- 00000000000062_outbound_webhooks.sql
-- Reactive Outbound Webhooks for Partner Integrations

-- Ensure necessary extensions are enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;

--------------------------------------------------
-- 1. NOTIFY ADMISSION CONFIRMED (TRIGGER FUNCTION)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_admission_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
BEGIN
    -- Only fire when status strictly changes to 'Confirmed'
    IF NEW.current_stage = 'Confirmed' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Confirmed') THEN
        
        -- Construct the standard outbound JSON payload
        payload := jsonb_build_object(
            'event', 'admission.confirmed',
            'data', jsonb_build_object(
                'admission_id', NEW.id,
                'lead_id', NEW.lead_id,
                'student_id', NEW.student_id,
                'university_id', NEW.university_id,
                'course_id', NEW.course_id,
                'status', NEW.current_stage,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            ),
            'timestamp', NOW()
        );

        -- Find all active webhooks subscribed to 'admission.confirmed' for this specific organization
        FOR webhook IN 
            SELECT url, secret 
            FROM public.webhooks 
            WHERE organization_id = NEW.organization_id 
            AND status = 'Active' 
            AND 'admission.confirmed' = ANY(events)
        LOOP
            -- Dispatch the webhook asynchronously using pg_net
            -- We sign the payload using HMAC SHA-256 so the partner can verify authenticity
            PERFORM net.http_post(
                url := webhook.url,
                body := payload,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'X-Edvix-Signature', encode(extensions.hmac(payload::text::bytea, webhook.secret::bytea, 'sha256'), 'hex')
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------
-- 2. ATTACH TRIGGER TO ADMISSIONS TABLE
--------------------------------------------------

DROP TRIGGER IF EXISTS trg_notify_admission_confirmed ON public.admissions;

CREATE TRIGGER trg_notify_admission_confirmed
    AFTER UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admission_confirmed();
