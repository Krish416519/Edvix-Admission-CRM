-- =============================================================================
-- 00000000000140_structured_lead_activities.sql
-- Add explicit structural columns to lead_activities for LSQ-style Timeline.
-- =============================================================================

-- 1. Add new columns to `lead_activities` table
ALTER TABLE public.lead_activities 
ADD COLUMN IF NOT EXISTS previous_value TEXT,
ADD COLUMN IF NOT EXISTS new_value TEXT,
ADD COLUMN IF NOT EXISTS previous_label TEXT,
ADD COLUMN IF NOT EXISTS new_label TEXT,
ADD COLUMN IF NOT EXISTS related_entity_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS related_entity_id UUID,
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- 2. Optimize Timeline loading
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_related_entity_type ON public.lead_activities(related_entity_type);

-- 3. Replace the `log_lead_activity` trigger function
-- Update to use the new structured columns
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_author  VARCHAR;
    v_type    VARCHAR;
    v_content TEXT;
    v_prev    TEXT := NULL;
    v_new     TEXT := NULL;
    v_prev_label TEXT := NULL;
    v_new_label  TEXT := NULL;
    v_org_id  UUID;
BEGIN
    BEGIN
        SELECT name INTO v_author FROM public.users WHERE id = auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_author := NULL;
    END;
    IF v_author IS NULL THEN v_author := 'System'; END IF;

    -- Extract org_id safely depending on column name
    BEGIN
        v_org_id := NEW.organization_id;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            v_org_id := NEW.org_id;
        EXCEPTION WHEN OTHERS THEN
            v_org_id := NULL;
        END;
    END;

    IF TG_OP = 'INSERT' THEN
        v_type    := 'lead_created';
        v_content := 'Lead was created.';
        v_new_label := 'Lead';
        
        -- Assigned at creation?
        IF NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                INSERT INTO public.lead_activities (
                    lead_id, type, content, author, created_by, organization_id,
                    previous_value, new_value, previous_label, new_label, source
                ) VALUES (
                    NEW.id, 'assignment', 'Lead was initially assigned.', v_author, auth.uid(), v_org_id,
                    'Unassigned', NEW.assigned_counselor::text, 'Assignment', 'Assignment', 'System'
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
            v_type    := 'status_change';
            v_content := 'Lead was deleted.';
            v_prev_label := 'Status'; v_new_label := 'Status';
            v_prev := 'Active'; v_new := 'Deleted';
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            v_type    := 'status_change';
            v_content := 'Lead was restored.';
            v_prev_label := 'Status'; v_new_label := 'Status';
            v_prev := 'Deleted'; v_new := 'Active';
        ELSIF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
            v_type    := 'assignment';
            v_content := 'Lead counselor was changed.';
            v_prev_label := 'Assignment'; v_new_label := 'Assignment';
            v_prev := COALESCE(OLD.assigned_counselor::text, 'Unassigned');
            v_new := COALESCE(NEW.assigned_counselor::text, 'Unassigned');
        ELSIF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
            -- Skip generating status change event here IF this was triggered by a Disposition save
            -- We'll assume if NEW.latest_disposition_id is distinct from OLD, the Disposition API is handling the activity insertion to avoid duplicates.
            IF NEW.latest_disposition_id IS NOT DISTINCT FROM OLD.latest_disposition_id THEN
                v_type    := 'status_change';
                v_content := 'Status changed from '
                          || COALESCE(OLD.lead_status, 'None')
                          || ' to '
                          || COALESCE(NEW.lead_status, 'None');
                v_prev_label := 'Lead Stage'; v_new_label := 'Lead Stage';
                v_prev := COALESCE(OLD.lead_status, 'None');
                v_new := COALESCE(NEW.lead_status, 'None');
            ELSE
                RETURN NEW; -- Handled by dispositionService.ts
            END IF;
        ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
            v_type    := 'priority_change';
            v_content := 'Priority changed.';
            v_prev_label := 'Priority'; v_new_label := 'Priority';
            v_prev := COALESCE(OLD.priority, 'Normal');
            v_new := COALESCE(NEW.priority, 'Normal');
        ELSE
            -- Don't log generic updates in timeline to avoid noise
            RETURN NEW;
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    BEGIN
        INSERT INTO public.lead_activities (
            lead_id, type, content, author, created_by, organization_id,
            previous_value, new_value, previous_label, new_label, source
        )
        VALUES (
            NEW.id, v_type, v_content, v_author, auth.uid(), v_org_id,
            v_prev, v_new, v_prev_label, v_new_label, 'System'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Never let activity logging crash the lead save
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger if needed (it already exists, but we want to ensure it's up to date)
DROP TRIGGER IF EXISTS on_lead_changes_log_activity ON public.leads;
CREATE TRIGGER on_lead_changes_log_activity
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.log_lead_activity();

GRANT INSERT ON public.lead_activities TO postgres;
GRANT INSERT ON public.lead_activities TO service_role;
