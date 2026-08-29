-- 00000000000125_fix_notification_org_lookup.sql

-- Fix insert_notification_if_preferred to correctly look up organization_id
-- from organization_users instead of the direct organization_id column on users table
-- (which doesn't exist - users are linked to orgs via organization_users)

CREATE OR REPLACE FUNCTION public.insert_notification_if_preferred(
    p_user_id UUID, p_module VARCHAR, p_record_id UUID, p_title TEXT, p_msg TEXT, p_pref_type VARCHAR, p_priority VARCHAR DEFAULT 'Low'
) RETURNS VOID AS $$
DECLARE
    v_pref BOOLEAN;
    v_org_id UUID;
BEGIN
    IF p_user_id IS NULL THEN RETURN; END IF;
    
    -- Get the user's organization_id from organization_users table
    -- (users table does NOT have organization_id column directly)
    SELECT ou.organization_id INTO v_org_id 
    FROM public.organization_users ou 
    WHERE ou.user_id = p_user_id AND ou.status = 'Active'
    LIMIT 1;

    -- Fallback: try the users.organization_id column if it exists (for forward-compat)
    IF v_org_id IS NULL THEN
        BEGIN
            SELECT organization_id INTO v_org_id 
            FROM public.users 
            WHERE id = p_user_id 
            AND organization_id IS NOT NULL;
        EXCEPTION WHEN OTHERS THEN
            -- Column doesn't exist, continue with NULL
        END;
    END IF;

    -- Fallback: get the first Edvix organization
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    END IF;

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
