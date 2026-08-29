-- =============================================================================
-- 00000000000130_canonical_call_attempts_interactions.sql
-- Fix Call Attempts and Interactions to use canonical computation logic.
--
-- Canonical rules:
--   Call Attempts  = COUNT(all Call records)  (both Connected and Not Connected)
--   Interactions   = COUNT(Call records WHERE connected)  (only connected calls)
--
-- The calls.status field determines connected vs not-connected:
--   Connected:   status IN ('completed', 'in-progress')
--   Not Connected: status IN ('missed', 'no-answer', 'busy', 'failed', 'voicemail',
--                   'initiated', 'ringing')
-- =============================================================================

-- 1. Fix the update_lead_activity_counts function to compute interactions
--    from the calls table (filtering by connected status) instead of
--    counting ALL lead_activities rows.
CREATE OR REPLACE FUNCTION public.update_lead_activity_counts(p_lead_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_call_count INTEGER;
    v_interaction_count INTEGER;
    v_last_call_date TIMESTAMPTZ;
    v_call_max_follow_up TIMESTAMPTZ;
    v_task_max_due_date TIMESTAMPTZ;
    v_final_follow_up_date TIMESTAMPTZ;
BEGIN
    IF p_lead_id IS NOT NULL THEN
        -- Update a single lead
        SELECT
            COALESCE(call_stats.call_count, 0),
            COALESCE(call_stats.interaction_count, 0),
            call_stats.last_call,
            call_stats.max_next_follow_up,
            task_stats.max_due_date
        INTO
            v_call_count, v_interaction_count, v_last_call_date, v_call_max_follow_up, v_task_max_due_date
        FROM public.leads l
        LEFT JOIN (
            SELECT
                lead_id,
                COUNT(*) as call_count,
                COUNT(*) FILTER (WHERE status IN ('completed', 'in-progress')) as interaction_count,
                MAX(created_at) as last_call,
                MAX(next_follow_up) as max_next_follow_up
            FROM public.calls
            WHERE lead_id = p_lead_id
            GROUP BY lead_id
        ) call_stats ON true
        LEFT JOIN (
            SELECT
                lead_id,
                MAX(due_date::timestamptz) as max_due_date
            FROM public.tasks
            WHERE lead_id = p_lead_id
            GROUP BY lead_id
        ) task_stats ON true
        WHERE l.id = p_lead_id;

        v_final_follow_up_date := COALESCE(v_call_max_follow_up, v_task_max_due_date);

        UPDATE public.leads
        SET
            call_attempts = v_call_count,
            interactions_count = v_interaction_count,
            last_call_date = v_last_call_date,
            final_follow_up_date = v_final_follow_up_date
        WHERE id = p_lead_id;
    ELSE
        -- Update all leads
        UPDATE public.leads l
        SET
            call_attempts = sub.call_count,
            interactions_count = sub.interaction_count,
            last_call_date = sub.last_call,
            final_follow_up_date = sub.final_followup
        FROM (
            SELECT
                l.id,
                COALESCE(c.call_count, 0) as call_count,
                COALESCE(c.interaction_count, 0) as interaction_count,
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
                    COUNT(*) FILTER (WHERE status IN ('completed', 'in-progress')) as interaction_count,
                    MAX(created_at) as last_call,
                    MAX(next_follow_up) as max_next_follow_up
                FROM public.calls
                GROUP BY lead_id
            ) c ON c.lead_id = l.id
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
$func$;

-- 2. Backfill all existing leads with corrected counts
SELECT public.update_lead_activity_counts(NULL);

-- 3. Add indexes for performance on computed columns (used for sorting in All Leads)
CREATE INDEX IF NOT EXISTS idx_leads_call_attempts ON public.leads(call_attempts);
CREATE INDEX IF NOT EXISTS idx_leads_interactions_count ON public.leads(interactions_count);
CREATE INDEX IF NOT EXISTS idx_leads_last_call_date ON public.leads(last_call_date);
CREATE INDEX IF NOT EXISTS idx_leads_final_follow_up_date ON public.leads(final_follow_up_date);

-- 4. Add composite index on calls for efficient call count computation
CREATE INDEX IF NOT EXISTS idx_calls_lead_id_status ON public.calls(lead_id, status);
