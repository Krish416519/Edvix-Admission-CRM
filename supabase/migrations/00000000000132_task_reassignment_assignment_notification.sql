-- =============================================================================
-- 00000000000132_task_reassignment_assignment_notification.sql
-- Fix: Task reassignment must send immediate "assigned to you" notification
--      to the new assignee, not just schedule reminders.
--
-- Gap: Migration 119's trg_reset_task_lifecycle deletes old task notifications
--      on reassignment but does NOT create a new assignment notification for
--      the new assignee. Migration 115's notify_task_changes only fires on INSERT.
--      Result: the new assignee misses the immediate "Task Assigned" notification.
-- =============================================================================

-- Drop the trigger first (function has a dependent trigger)
DROP TRIGGER IF EXISTS trg_task_lifecycle_reset_on_update ON public.tasks;
DROP FUNCTION IF EXISTS public.trg_reset_task_lifecycle();

CREATE OR REPLACE FUNCTION public.trg_reset_task_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_old_assignee UUID := OLD.assigned_user;
    v_new_assignee UUID := NEW.assigned_user;
BEGIN
    -- Check if due_date, due_time, or assigned_user has changed
    IF NEW.due_date IS DISTINCT FROM OLD.due_date OR 
       NEW.due_time IS DISTINCT FROM OLD.due_time OR 
       v_new_assignee IS DISTINCT FROM v_old_assignee THEN

        -- Delete all existing 'Tasks' notifications for this task to reset the lifecycle.
        -- This clears old 'task_due_soon', 'task_due_now', and 'task_overdue' notifications
        -- so the scheduler can generate fresh ones at the appropriate time for the new owner/schedule.
        DELETE FROM public.notifications 
        WHERE module = 'Tasks' AND module_record_id = NEW.id;

        -- If the task was reassigned to a NEW user, send an immediate assignment notification
        -- to the new assignee (Requirement 5B: immediate "You have been assigned a new task").
        -- Only fire if there is a new assignee AND it's different from the old one.
        IF v_new_assignee IS NOT NULL 
           AND v_new_assignee IS DISTINCT FROM v_old_assignee THEN
            BEGIN
                PERFORM public.insert_notification_if_preferred(
                    v_new_assignee, 'Tasks', NEW.id,
                    'Task Reassigned to You',
                    'Task "' || NEW.title || '" has been reassigned to you.',
                    'task_reminders', 'High'
                );
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger (schema is same as before)
DROP TRIGGER IF EXISTS trg_task_lifecycle_reset_on_update ON public.tasks;
CREATE TRIGGER trg_task_lifecycle_reset_on_update
    AFTER UPDATE
    ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_reset_task_lifecycle();
