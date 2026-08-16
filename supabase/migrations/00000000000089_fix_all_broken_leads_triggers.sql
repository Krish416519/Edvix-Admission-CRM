-- 00000000000089_fix_all_broken_leads_triggers.sql
-- COMPREHENSIVE FIX: Remove or replace every trigger on public.leads that
-- references non-existent columns or outdated column names.
--
-- Column renames that happened in migration 007:
--   name         → first_name (+ last_name)
--   status       → lead_status
--   source       → lead_source
--   counselor_id → assigned_counselor
--
-- Additionally, the 'updated_by' column does NOT exist on leads.
-- The set_updated_by_leads BEFORE UPDATE trigger crashes every UPDATE.

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Drop ALL triggers on public.leads so we start clean
-- ══════════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS set_updated_by_leads            ON public.leads;
DROP TRIGGER IF EXISTS trg_notify_lead_events          ON public.leads;
DROP TRIGGER IF EXISTS leads_notify_events             ON public.leads;
DROP TRIGGER IF EXISTS on_lead_changes_log_activity    ON public.leads;
DROP TRIGGER IF EXISTS trg_log_lead_activity           ON public.leads;
DROP TRIGGER IF EXISTS trg_leads_updated_at            ON public.leads;
DROP TRIGGER IF EXISTS set_leads_updated_at            ON public.leads;
DROP TRIGGER IF EXISTS leads_updated_at_trigger        ON public.leads;
DROP TRIGGER IF EXISTS trg_notify_lead_changes         ON public.leads;
DROP TRIGGER IF EXISTS notify_lead_changes_trigger     ON public.leads;
DROP TRIGGER IF EXISTS on_lead_update_notify           ON public.leads;
DROP TRIGGER IF EXISTS lead_auto_number                ON public.leads;
DROP TRIGGER IF EXISTS trg_auto_lead_number            ON public.leads;
DROP TRIGGER IF EXISTS trg_leads_auto_number           ON public.leads;
DROP TRIGGER IF EXISTS leads_auto_number_trigger       ON public.leads;

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Fix update_updated_by_column — remove it (no updated_by column)
-- ══════════════════════════════════════════════════════════════════════════════
-- This function tried to set NEW.updated_by which doesn't exist on leads.
-- Safe to drop since leads uses updated_at (handled by handle_updated_at triggers).
DROP FUNCTION IF EXISTS public.update_updated_by_column() CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Safe updated_at trigger (replaces set_updated_by_leads)
-- ══════════════════════════════════════════════════════════════════════════════
-- Use the generic handle_updated_at_generic if it exists, otherwise create one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at_generic'
    ) THEN
        CREATE OR REPLACE FUNCTION public.handle_updated_at_generic()
        RETURNS TRIGGER LANGUAGE plpgsql AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$;
    END IF;
END;
$$;

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_generic();

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Fixed log_lead_activity (correct column names, guarded)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_author TEXT;
    v_type   TEXT;
    v_content TEXT;
BEGIN
    BEGIN
        SELECT COALESCE(full_name, name, email) INTO v_author
        FROM public.users WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_author := NULL;
    END;
    IF v_author IS NULL THEN v_author := 'System'; END IF;

    IF TG_OP = 'INSERT' THEN
        v_type    := 'lead_created';
        v_content := 'Lead was created.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_type    := 'status_change';
            v_content := 'Lead was deleted.';
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            v_type    := 'status_change';
            v_content := 'Lead was restored.';
        ELSIF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
            v_type    := 'assignment';
            v_content := 'Lead counselor was changed.';
        ELSIF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
            v_type    := 'status_change';
            v_content := 'Status changed from '
                      || COALESCE(OLD.lead_status, 'None')
                      || ' to '
                      || COALESCE(NEW.lead_status, 'None');
        ELSE
            v_type    := 'update';
            v_content := 'Lead information was updated.';
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    BEGIN
        INSERT INTO public.lead_activities (lead_id, type, content, author, created_by)
        VALUES (NEW.id, v_type, v_content, v_author, auth.uid());
    EXCEPTION WHEN OTHERS THEN
        -- Never let activity logging crash the lead save
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_lead_changes_log_activity
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.log_lead_activity();

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Fixed notify_lead_changes (correct column names, guarded)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
    admin_rec  RECORD;
    lead_name  TEXT;
BEGIN
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')), ''),
        'Unknown'
    );

    IF TG_OP = 'INSERT' THEN
        -- Notify assigned counselor
        IF NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'New Lead Assigned',
                    'Lead ' || lead_name || ' was assigned to you.',
                    'general', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        -- Notify Super Admins / Admins
        BEGIN
            FOR admin_rec IN
                SELECT u.id FROM public.users u
                JOIN public.roles r ON u.role_id = r.id
                WHERE r.name IN ('Super Admin', 'Admin')
            LOOP
                IF NEW.assigned_counselor IS NULL OR NEW.assigned_counselor != admin_rec.id THEN
                    PERFORM public.insert_notification_if_preferred(
                        admin_rec.id, 'Leads', NEW.id,
                        'New Lead Captured',
                        'A new lead (' || lead_name || ') has been captured.',
                        'general', 'Medium'
                    );
                END IF;
            END LOOP;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor
           AND NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'Lead Assigned',
                    'Lead ' || lead_name || ' was assigned to you.',
                    'general', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        -- Use lead_status (the correct column name)
        IF NEW.lead_status IS DISTINCT FROM OLD.lead_status
           AND NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'Lead Status Changed',
                    'Lead ' || lead_name || ' status changed to ' || COALESCE(NEW.lead_status, 'Unknown'),
                    'general'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    -- Never break the lead save due to notification failures
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_lead_changes
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_changes();

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Fixed notify_lead_events (correct column names, fully guarded)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_lead_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook         RECORD;
    payload         JSONB;
    detected_events TEXT[] := '{}';
    evt             TEXT;
    automation_url  TEXT;
    lead_name       TEXT;
BEGIN
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')), ''),
        'Unknown'
    );

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'lead.created');
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS NOT NULL AND OLD.assigned_counselor IS NULL THEN
            detected_events := array_append(detected_events, 'lead.assigned');
        END IF;
        IF NEW.lead_status = 'Qualified'
           AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Qualified') THEN
            detected_events := array_append(detected_events, 'lead.qualified');
        END IF;
        IF NEW.lead_status IN ('Lost','Dropped')
           AND (OLD.lead_status IS NULL OR OLD.lead_status NOT IN ('Lost','Dropped')) THEN
            detected_events := array_append(detected_events, 'lead.lost');
        END IF;
        IF NEW.lead_status = 'Admission Done'
           AND (OLD.lead_status IS NULL OR OLD.lead_status != 'Admission Done') THEN
            detected_events := array_append(detected_events, 'lead.admitted');
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
            'event',           evt,
            'organization_id', NEW.organization_id,
            'lead_id',         NEW.id,
            'lead_number',     NEW.lead_number,
            'name',            lead_name,
            'email',           NEW.email,
            'phone',           NEW.phone,
            'course',          NEW.course,
            'lead_source',     NEW.lead_source,
            'campaign',        NEW.campaign,
            'city',            NEW.city,
            'state',           NEW.state,
            'lead_status',     NEW.lead_status,
            'counselor_id',    NEW.assigned_counselor,
            'timestamp',       NOW()
        );

        -- Dispatch to outbound webhooks
        BEGIN
            FOR webhook IN
                SELECT id, url, secret FROM public.webhooks
                WHERE organization_id = NEW.organization_id
                  AND status = 'Active'
                  AND evt = ANY(events)
            LOOP
                BEGIN
                    PERFORM public.dispatch_webhook(
                        NEW.organization_id, webhook.id,
                        webhook.url, webhook.secret, evt, payload
                    );
                EXCEPTION WHEN OTHERS THEN NULL;
                END;
            END LOOP;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        -- Ping automation runner
        BEGIN
            PERFORM net.http_post(
                url     := automation_url,
                body    := payload,
                headers := jsonb_build_object('Content-Type','application/json')
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_lead_events
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_events();

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 7: Grants
-- ══════════════════════════════════════════════════════════════════════════════
GRANT INSERT ON public.lead_activities TO postgres;
GRANT INSERT ON public.lead_activities TO service_role;
