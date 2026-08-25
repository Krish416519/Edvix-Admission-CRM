-- 00000000000100_fix_admission_trigger_stage_column.sql
-- Fix: Triggers in migrations 63 and 65 reference NEW.stage / OLD.stage
-- but the actual column on public.admissions is `current_stage`.
-- This migration recreates both functions with the correct column name.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Fix notify_admission_confirmed (from migration 63)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_admission_confirmed()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    uni_name VARCHAR;
BEGIN
    -- Use current_stage (the real column name), not stage
    IF NEW.current_stage = 'Confirmed' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Confirmed') THEN

        IF NEW.university_id IS NOT NULL THEN
            SELECT name INTO uni_name FROM public.universities WHERE id = NEW.university_id;
        END IF;

        payload := jsonb_build_object(
            'event', 'admission.confirmed',
            'student_id', COALESCE(NEW.student_id, ''),
            'application_id', COALESCE(NEW.application_id, ''),
            'university', COALESCE(uni_name, '')
        );

        FOR webhook IN
            SELECT url, secret
            FROM public.webhooks
            WHERE organization_id = NEW.organization_id
            AND status = 'Active'
            AND 'admission.confirmed' = ANY(events)
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Fix notify_admission_events (from migration 65)
-- ──────────────────────────────────────────────────────────────────────────────
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
        -- Use current_stage (the real column name), not stage
        IF NEW.current_stage = 'Submitted' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Submitted') THEN
            detected_events := array_append(detected_events, 'admission.submitted');
        END IF;
        IF NEW.current_stage = 'Approved' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Approved') THEN
            detected_events := array_append(detected_events, 'admission.approved');
        END IF;
        IF (NEW.current_stage = 'Rejected' OR NEW.current_stage = 'Declined') AND (OLD.current_stage IS NULL OR (OLD.current_stage != 'Rejected' AND OLD.current_stage != 'Declined')) THEN
            detected_events := array_append(detected_events, 'admission.rejected');
        END IF;
        IF NEW.current_stage = 'Confirmed' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'Confirmed') THEN
            detected_events := array_append(detected_events, 'admission.confirmed');
        END IF;
    END IF;

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

-- Triggers already exist and point to the right functions — no need to recreate them.
-- The CREATE OR REPLACE above fixes both functions in-place.
