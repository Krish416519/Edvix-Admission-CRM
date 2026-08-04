-- 00000000000041_rbac_functions.sql
-- Enterprise Role-Based Access Control Functions

-- 1. Get the live role name for a given user (optimized)
CREATE OR REPLACE FUNCTION public.get_user_role_name(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_role_name VARCHAR;
BEGIN
    SELECT r.name INTO v_role_name
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;
    RETURN v_role_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Overwrite the existing user_role() to use live database instead of JWT
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT public.get_user_role_name(auth.uid())::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Core RBAC Engine Function: Check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR;
    v_user_team VARCHAR;
    v_user_department VARCHAR;
    v_has_access BOOLEAN := FALSE;
BEGIN
    -- Get user details
    SELECT r.name, u.team, u.department 
    INTO v_role_name, v_user_team, v_user_department
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();

    -- Super Admin bypasses all checks
    IF v_role_name = 'Super Admin' THEN
        RETURN TRUE;
    END IF;

    -- Check Role-Based Permissions
    IF EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        JOIN public.roles r ON rp.role_id = r.id
        WHERE r.name = v_role_name 
        AND p.action = p_action 
        AND p.resource = p_resource
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check Department-Based Permissions
    IF v_user_department IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.department_permissions dp
        JOIN public.permissions p ON dp.permission_id = p.id
        WHERE dp.department = v_user_department
        AND p.action = p_action 
        AND p.resource = p_resource
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check Team-Based Permissions
    IF v_user_team IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_permissions tp
        JOIN public.permissions p ON tp.permission_id = p.id
        WHERE tp.team = v_user_team
        AND p.action = p_action 
        AND p.resource = p_resource
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION public.log_permission_event()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_role_name VARCHAR;
    v_action VARCHAR;
    v_module VARCHAR;
    v_record_id UUID;
BEGIN
    -- This trigger function captures sensitive actions and logs them.
    -- Assuming this is triggered on sensitive tables (e.g. leads, finance).
    v_user_id := auth.uid();
    v_role_name := public.user_role();
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;