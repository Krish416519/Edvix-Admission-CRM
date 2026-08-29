-- Migration 119: Task Lifecycle Reset Trigger

-- Function to handle task updates and reset the notification lifecycle
CREATE OR REPLACE FUNCTION public.trg_reset_task_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if due_date, due_time, or assigned_user has changed
    IF NEW.due_date IS DISTINCT FROM OLD.due_date OR 
       NEW.due_time IS DISTINCT FROM OLD.due_time OR 
       NEW.assigned_user IS DISTINCT FROM OLD.assigned_user THEN
       
       -- Delete all existing 'Tasks' notifications for this task to reset the lifecycle.
       -- This clears old 'task_due_soon', 'task_due_now', and 'task_overdue' notifications
       -- so the scheduler can generate fresh ones at the appropriate time for the new owner/schedule.
       DELETE FROM public.notifications 
       WHERE module = 'Tasks' AND module_record_id = NEW.id;
       
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_task_lifecycle_reset_on_update ON public.tasks;
CREATE TRIGGER trg_task_lifecycle_reset_on_update
    AFTER UPDATE
    ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_reset_task_lifecycle();
