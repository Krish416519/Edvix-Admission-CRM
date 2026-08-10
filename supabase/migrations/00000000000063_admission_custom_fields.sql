-- 00000000000063_admission_custom_fields.sql

DO $$ 
BEGIN
    -- Add application_id and student_id if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admissions' AND column_name = 'application_id') THEN
        ALTER TABLE public.admissions ADD COLUMN application_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admissions' AND column_name = 'student_id') THEN
        ALTER TABLE public.admissions ADD COLUMN student_id VARCHAR(100);
    END IF;
END $$;

--------------------------------------------------
-- 1. FIX TRIGGER LOGIC AND PAYLOAD FORMAT
--------------------------------------------------
-- We need to drop the old trigger first just in case
DROP TRIGGER IF EXISTS trg_notify_admission_confirmed ON public.admissions;

CREATE OR REPLACE FUNCTION public.notify_admission_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    uni_name VARCHAR;
BEGIN
    -- Only fire when 'stage' strictly changes to 'Confirmed'
    IF NEW.stage = 'Confirmed' AND (OLD.stage IS NULL OR OLD.stage != 'Confirmed') THEN
        
        -- Get the university name
        IF NEW.university_id IS NOT NULL THEN
            SELECT name INTO uni_name FROM public.universities WHERE id = NEW.university_id;
        END IF;

        -- Construct the exact outbound JSON payload requested by the user
        payload := jsonb_build_object(
            'event', 'admission.confirmed',
            'student_id', COALESCE(NEW.student_id, ''),
            'application_id', COALESCE(NEW.application_id, ''),
            'university', COALESCE(uni_name, '')
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
-- 2. REATTACH TRIGGER
--------------------------------------------------
CREATE TRIGGER trg_notify_admission_confirmed
    AFTER UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admission_confirmed();
