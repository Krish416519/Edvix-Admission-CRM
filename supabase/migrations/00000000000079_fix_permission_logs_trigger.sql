-- 00000000000079_fix_permission_logs_trigger.sql

CREATE OR REPLACE FUNCTION public.log_permission_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_role_name VARCHAR;
    v_action VARCHAR;
    v_module VARCHAR;
    v_record_id UUID;
BEGIN
    -- This trigger function captures sensitive actions and logs them.
    v_user_id := auth.uid();
    v_role_name := public.user_role();
    
    -- If the user_role is null, it's a service/API key action without a matching user record
    -- We skip logging to permission_logs since the API has its own api_logs and idempotency tracking.
    IF v_role_name IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'Create';
        v_record_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'Update';
        v_record_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'Delete';
        v_record_id := OLD.id;
    END IF;

    v_module := TG_TABLE_NAME;

    INSERT INTO public.permission_logs (user_id, user_role, action, module, record_id)
    VALUES (v_user_id, v_role_name, v_action, v_module, v_record_id);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;
