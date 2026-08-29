-- 00000000000126_lead_activity_summary_views.sql

-- =============================================================
-- Adds computed columns/aggregated views for lead activity data
-- Used by the All Leads table and Smart Views
-- =============================================================

-- 1. Ensure leads table has the computed columns we need (for direct querying)
-- updated_at already exists via handle_updated_at trigger (migration 007)
-- We add columns for call_attempts, interactions_count, last_call_date, final_follow_up_date

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS call_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_call_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_follow_up_date TIMESTAMPTZ;

-- 2. Function to update lead activity counts from calls and activities tables
CREATE OR REPLACE FUNCTION public.update_lead_activity_counts(p_lead_id UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    v_call_count INTEGER;
    v_activity_count INTEGER;
    v_last_call_date TIMESTAMPTZ;
    v_final_follow_up_date TIMESTAMPTZ;
BEGIN
    IF p_lead_id IS NOT NULL THEN
        -- Update a single lead
        SELECT
            COALESCE(call_stats.call_count, 0),
            COALESCE(activity_stats.activity_count, 0),
            call_stats.last_call,
            COALESCE(call_stats.max_next_follow_up, task_stats.max_due_date)
        INTO
            v_call_count, v_activity_count, v_last_call_date, v_final_follow_up_date
        FROM public.leads l
        LEFT JOIN (
            SELECT
                lead_id,
                COUNT(*) as call_count,
                MAX(created_at) as last_call,
                MAX(next_follow_up) as max_next_follow_up
            FROM public.calls
            WHERE lead_id = p_lead_id
            GROUP BY lead_id
        ) call_stats ON true
        LEFT JOIN (
            SELECT
                lead_id,
                COUNT(*) as activity_count
            FROM public.lead_activities
            WHERE lead_id = p_lead_id
            GROUP BY lead_id
        ) activity_stats ON true
        LEFT JOIN (
            SELECT
                lead_id,
                MAX(due_date::timestamptz) as max_due_date
            FROM public.tasks
            WHERE lead_id = p_lead_id
            GROUP BY lead_id
        ) task_stats ON true
        WHERE l.id = p_lead_id;

        -- Compare call next_follow_up and task due_date, take the max
        IF v_final_follow_up_date IS NULL THEN
            v_final_follow_up_date := call_stats.max_next_follow_up;
        ELSIF call_stats.max_next_follow_up IS NOT NULL AND call_stats.max_next_follow_up > v_final_follow_up_date THEN
            v_final_follow_up_date := call_stats.max_next_follow_up;
        END IF;

        UPDATE public.leads
        SET
            call_attempts = v_call_count,
            interactions_count = v_activity_count,
            last_call_date = v_last_call_date,
            final_follow_up_date = v_final_follow_up_date
        WHERE id = p_lead_id;
    ELSE
        -- Update all leads
        UPDATE public.leads l
        SET
            call_attempts = sub.call_count,
            interactions_count = sub.activity_count,
            last_call_date = sub.last_call,
            final_follow_up_date = sub.final_followup
        FROM (
            SELECT
                l.id,
                COALESCE(c.call_count, 0) as call_count,
                COALESCE(a.activity_count, 0) as activity_count,
                c.last_call,
                GREATEST(
                    COALESCE(c.max_next_follow_up, '-infinity'::timestamptz),
                    COALESCE(t.max_due_date, '-infinity'::timestamptz)
                ) as final_followup
            FROM public.leads l
            LEFT JOIN (
                SELECT
                    lead_id,
                    COUNT(*) as call_count,
                    MAX(created_at) as last_call,
                    MAX(next_follow_up) as max_next_follow_up
                FROM public.calls
                GROUP BY lead_id
            ) c ON c.lead_id = l.id
            LEFT JOIN (
                SELECT
                    lead_id,
                    COUNT(*) as activity_count
                FROM public.lead_activities
                GROUP BY lead_id
            ) a ON a.lead_id = l.id
            LEFT JOIN (
                SELECT
                    lead_id,
                    MAX(due_date::timestamptz) as max_due_date
                FROM public.tasks
                GROUP BY lead_id
            ) t ON t.lead_id = l.id
        ) sub
        WHERE l.id = sub.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger to keep counts updated when calls are added/modified/deleted
CREATE OR REPLACE FUNCTION public.trigger_update_lead_on_call_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_lead_activity_counts(NEW.lead_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_lead_activity_counts(OLD.lead_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lead_on_call_change ON public.calls;
CREATE TRIGGER trg_update_lead_on_call_change
    AFTER INSERT OR UPDATE OR DELETE ON public.calls
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_lead_on_call_change();

-- 4. Trigger to keep counts updated when activities are added/modified/deleted
CREATE OR REPLACE FUNCTION public.trigger_update_lead_on_activity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_lead_activity_counts(NEW.lead_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_lead_activity_counts(OLD.lead_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lead_on_activity_change ON public.lead_activities;
CREATE TRIGGER trg_update_lead_on_activity_change
    AFTER INSERT OR UPDATE OR DELETE ON public.lead_activities
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_lead_on_activity_change();

-- 5. Trigger to keep counts updated when tasks are added/modified/deleted
CREATE OR REPLACE FUNCTION public.trigger_update_lead_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_lead_activity_counts(NEW.lead_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_lead_activity_counts(OLD.lead_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lead_on_task_change ON public.tasks;
CREATE TRIGGER trg_update_lead_on_task_change
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.trigger_update_lead_on_task_change();

-- 6. One-time backfill for all existing leads
SELECT public.update_lead_activity_counts(NULL);
