-- Fix: update_lead_activity_counts function references call_stats variable outside its scope
-- This caused INSERT/UPDATE on calls, lead_activities, and tasks to fail with
-- "missing FROM-clause entry for table 'call_stats'"

CREATE OR REPLACE FUNCTION public.update_lead_activity_counts(p_lead_id uuid DEFAULT NULL::uuid) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $func$ 
DECLARE 
    v_call_count INTEGER;
    v_activity_count INTEGER;
    v_last_call_date TIMESTAMPTZ;
    v_call_max_follow_up TIMESTAMPTZ;
    v_task_max_due_date TIMESTAMPTZ;
    v_final_follow_up_date TIMESTAMPTZ;
BEGIN 
    IF p_lead_id IS NOT NULL THEN
        -- Update a single lead
        SELECT 
            COALESCE(call_stats.call_count, 0),
            COALESCE(activity_stats.activity_count, 0),
            call_stats.last_call,
            call_stats.max_next_follow_up,
            task_stats.max_due_date
        INTO 
            v_call_count, v_activity_count, v_last_call_date, v_call_max_follow_up, v_task_max_due_date
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
        
        v_final_follow_up_date := COALESCE(v_call_max_follow_up, v_task_max_due_date);
        
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
$func$;

-- Create wrapper for increment_lead_tasks_count that was referenced in code but doesn't exist
CREATE OR REPLACE FUNCTION public.increment_lead_tasks_count(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    PERFORM public.update_lead_activity_counts(p_lead_id);
END;
$function$;
