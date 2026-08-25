-- =============================================================================
-- 00000000000094_automation_v2.sql
-- Step 32: Advanced Automation & Workflow Engine 2.0
-- =============================================================================

-- 1. Extend automation_workflows
ALTER TABLE public.automation_workflows
ADD COLUMN IF NOT EXISTS conditions_tree JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_execution_depth INTEGER DEFAULT 5;

-- 2. Extend automation_runs
ALTER TABLE public.automation_runs
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_depth INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL;

-- 3. Extend automation_execution_logs
ALTER TABLE public.automation_execution_logs
ADD COLUMN IF NOT EXISTS step_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_step INTEGER;

-- 4. Create internal routing function for all event types to automation-runner
CREATE OR REPLACE FUNCTION public.dispatch_automation_event()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    event_prefix TEXT;
    evt TEXT;
    automation_url TEXT;
    org_id UUID;
BEGIN
    -- Determine table to set event prefix and organization_id
    IF TG_TABLE_NAME = 'leads' THEN
        event_prefix := 'lead.';
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'students' THEN
        event_prefix := 'student.';
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'applications' THEN
        event_prefix := 'application.';
        org_id := NEW.organization_id;
    ELSIF TG_TABLE_NAME = 'admissions' THEN
        event_prefix := 'admission.';
        org_id := (SELECT organization_id FROM public.leads WHERE id = NEW.lead_id LIMIT 1);
    ELSIF TG_TABLE_NAME = 'payments' THEN
        event_prefix := 'payment.';
        org_id := (SELECT leads.organization_id FROM public.leads 
                   JOIN public.admissions ON admissions.lead_id = leads.id 
                   WHERE admissions.id = NEW.admission_id LIMIT 1);
    ELSIF TG_TABLE_NAME = 'tasks' THEN
        event_prefix := 'task.';
        org_id := NEW.organization_id;
    ELSE
        RETURN NEW;
    END IF;

    -- Determine event type based on TG_OP
    IF TG_OP = 'INSERT' THEN
        evt := event_prefix || 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'leads' AND NEW.status != OLD.status THEN
            evt := event_prefix || 'status_changed';
        ELSIF TG_TABLE_NAME = 'applications' AND NEW.status != OLD.status THEN
            evt := event_prefix || 'status_changed';
        ELSIF TG_TABLE_NAME = 'admissions' AND NEW.status != OLD.status THEN
            evt := event_prefix || 'status_changed';
        ELSIF TG_TABLE_NAME = 'payments' AND NEW.status != OLD.status THEN
            evt := event_prefix || NEW.status; -- e.g., payment.Paid, payment.Failed
        ELSE
            evt := event_prefix || 'updated';
        END IF;
    ELSE
        RETURN OLD;
    END IF;

    payload := jsonb_build_object(
        'event', evt,
        'organization_id', org_id,
        'record_id', NEW.id,
        'table', TG_TABLE_NAME,
        'new_data', row_to_json(NEW),
        'old_data', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );

    -- Get Automation Runner URL
    automation_url := COALESCE(
        current_setting('app.settings.automation_runner_url', true), 
        'http://host.docker.internal:54321/functions/v1/automation-runner'
    );

    -- Internal Automation Runner
    PERFORM net.http_post(
        url := automation_url,
        body := payload,
        headers := jsonb_build_object('Content-Type', 'application/json')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for other tables (Lead already handled by notify_lead_events, but we can add this for the rest)

DROP TRIGGER IF EXISTS automation_dispatch_students ON public.students;
CREATE TRIGGER automation_dispatch_students
    AFTER INSERT OR UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_event();

DROP TRIGGER IF EXISTS automation_dispatch_applications ON public.applications;
CREATE TRIGGER automation_dispatch_applications
    AFTER INSERT OR UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_event();

DROP TRIGGER IF EXISTS automation_dispatch_admissions ON public.admissions;
CREATE TRIGGER automation_dispatch_admissions
    AFTER INSERT OR UPDATE ON public.admissions
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_event();

DROP TRIGGER IF EXISTS automation_dispatch_payments ON public.payments;
CREATE TRIGGER automation_dispatch_payments
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_event();

DROP TRIGGER IF EXISTS automation_dispatch_tasks ON public.tasks;
CREATE TRIGGER automation_dispatch_tasks
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_event();
