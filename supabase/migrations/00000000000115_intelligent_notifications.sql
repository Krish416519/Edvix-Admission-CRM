-- =============================================================================
-- 00000000000115_intelligent_notifications.sql
-- Intelligent Role-Based Notification Engine Update
-- Reduces notification fatigue by restricting triggers to HIGH priority actions.
-- =============================================================================

--------------------------------------------------
-- STEP 1: DEDUPLICATION INDEX
--------------------------------------------------
-- Prevents the same task from generating duplicate due_soon or overdue notifications for the same user
-- Clean up any existing duplicates first
DELETE FROM public.notifications a USING public.notifications b
WHERE a.ctid > b.ctid
  AND a.recipient_id = b.recipient_id
  AND a.module_record_id = b.module_record_id
  AND a.category = b.category
  AND a.category IN ('task_due_soon', 'task_overdue');

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_task_dedup 
ON public.notifications (recipient_id, module_record_id, category)
WHERE category IN ('task_due_soon', 'task_overdue');

--------------------------------------------------
-- STEP 2: LEADS NOTIFICATION TRIGGER (REFINED)
--------------------------------------------------
-- Drop the existing trigger to recreate the function safely
DROP TRIGGER IF EXISTS trg_notify_lead_changes ON public.leads;

CREATE OR REPLACE FUNCTION public.notify_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
    lead_name TEXT;
BEGIN
    lead_name := COALESCE(
        NULLIF(TRIM(COALESCE(NEW.first_name,'') || ' ' || COALESCE(NEW.last_name,'')), ''),
        'Unknown'
    );

    IF TG_OP = 'INSERT' THEN
        -- Priority 1: New Lead Assigned (Notify assignee only)
        IF NEW.assigned_counselor IS NOT NULL THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    NEW.assigned_counselor, 'Leads', NEW.id,
                    'New Lead Assigned',
                    'Lead ' || lead_name || ' has been assigned to you.',
                    'general', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;
    END IF;

    -- WE EXPLICITLY DO NOT FIRE NOTIFICATIONS ON UPDATE FOR:
    -- 1. Lead Reassigned (NO)
    -- 2. Lead Unassigned (NO)
    -- 3. Lead Status Changed (NO)
    -- 4. Lead Field Updates (NO)
    -- These are recorded in the Activity Log (lead_activities), but do not flood the notification bell.

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    -- Never break the lead save due to notification failures
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reattach trigger
CREATE TRIGGER trg_notify_lead_changes
    AFTER INSERT
    ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_lead_changes();


--------------------------------------------------
-- STEP 3: TASKS NOTIFICATION TRIGGER (REFINED)
--------------------------------------------------
DROP TRIGGER IF EXISTS trg_notify_task_changes ON public.tasks;

CREATE OR REPLACE FUNCTION public.notify_task_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.assigned_user IS NOT NULL THEN
        -- Task Assigned (Notify assignee)
        BEGIN
            PERFORM public.insert_notification_if_preferred(
                NEW.assigned_user, 'Tasks', NEW.id, 
                'New Task Assigned', 
                'Task "' || NEW.title || '" has been assigned to you.', 
                'task_reminders', 'High'
            );
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- WE EXPLICITLY DO NOT FIRE NOTIFICATIONS ON UPDATE FOR:
    -- 1. Task Completed (NO)
    -- 2. Task Re-opened (NO - optional, default OFF to reduce fatigue)

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger
CREATE TRIGGER trg_notify_task_changes 
    AFTER INSERT 
    ON public.tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION public.notify_task_changes();
