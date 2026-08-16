-- 00000000000091_fix_notifications_multi_tenant.sql
-- Fixes insert_notification_if_preferred to support organization_id

CREATE OR REPLACE FUNCTION public.insert_notification_if_preferred(
    p_user_id UUID, p_module VARCHAR, p_record_id UUID, p_title TEXT, p_msg TEXT, p_pref_type VARCHAR, p_priority VARCHAR DEFAULT 'Low'
) RETURNS VOID AS $$
DECLARE
    v_pref BOOLEAN;
    v_org_id UUID;
BEGIN
    IF p_user_id IS NULL THEN RETURN; END IF;
    
    -- Get the user's organization to satisfy the NOT NULL constraint on notifications
    SELECT organization_id INTO v_org_id FROM public.users WHERE id = p_user_id;

    -- Check user preference based on type
    SELECT 
        CASE p_pref_type
            WHEN 'task_reminders' THEN task_reminders
            WHEN 'finance_alerts' THEN finance_alerts
            ELSE TRUE -- default
        END INTO v_pref
    FROM public.notification_preferences WHERE user_id = p_user_id;

    -- If no preference record exists or preference is true, send it
    IF COALESCE(v_pref, TRUE) THEN
        INSERT INTO public.notifications (organization_id, recipient_id, module, module_record_id, title, message, priority, category)
        VALUES (v_org_id, p_user_id, p_module, p_record_id, p_title, p_msg, p_priority, p_pref_type);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
