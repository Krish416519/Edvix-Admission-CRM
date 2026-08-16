-- =============================================================================
-- 00000000000085_lead_capture_notifications.sql
-- Update notify_lead_changes to notify Super Admins on new lead capture
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_lead_changes() RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    lead_name TEXT;
BEGIN
    -- Determine lead name securely
    lead_name := COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, NEW.first_name, 'Unknown');

    IF TG_OP = 'INSERT' THEN
        -- 1. Notify the assigned counselor if any
        IF NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'New Lead Assigned', 'Lead ' || lead_name || ' was assigned to you.', 'general', 'High');
        END IF;

        -- 2. Notify all Super Admins and Admins about the new lead capture
        FOR admin_record IN 
            SELECT u.id 
            FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE r.name IN ('Super Admin', 'Admin')
        LOOP
            -- Avoid double notification if the admin is also the assigned counselor
            IF NEW.assigned_counselor IS NULL OR NEW.assigned_counselor != admin_record.id THEN
                PERFORM public.insert_notification_if_preferred(admin_record.id, 'Leads', NEW.id, 'New Lead Captured', 'A new lead (' || lead_name || ') has been captured.', 'general', 'Medium');
            END IF;
        END LOOP;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Assigned', 'Lead ' || lead_name || ' was assigned to you.', 'general', 'High');
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Status Changed', 'Lead ' || lead_name || ' status changed to ' || NEW.status, 'general');
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
