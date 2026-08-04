-- 00000000000043_get_permissions_rpc.sql
-- Create an RPC to fetch all permissions for a specific user

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (action VARCHAR, resource VARCHAR) AS $$
DECLARE
    v_role_name VARCHAR;
    v_user_team VARCHAR;
    v_user_department VARCHAR;
BEGIN
    -- Get user details
    SELECT r.name, u.team, u.department 
    INTO v_role_name, v_user_team, v_user_department
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;

    RETURN QUERY
    -- Super Admin gets all permissions
    SELECT p.action, p.resource FROM public.permissions p WHERE v_role_name = 'Super Admin'
    UNION
    -- Role permissions
    SELECT p.action, p.resource FROM public.permissions p
    JOIN public.role_permissions rp ON p.id = rp.permission_id
    JOIN public.roles r ON rp.role_id = r.id
    WHERE r.name = v_role_name
    UNION
    -- Department permissions
    SELECT p.action, p.resource FROM public.permissions p
    JOIN public.department_permissions dp ON p.id = dp.permission_id
    WHERE dp.department = v_user_department
    UNION
    -- Team permissions
    SELECT p.action, p.resource FROM public.permissions p
    JOIN public.team_permissions tp ON p.id = tp.permission_id
    WHERE tp.team = v_user_team;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
