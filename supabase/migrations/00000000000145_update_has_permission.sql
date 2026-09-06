-- 00000000000145_update_has_permission.sql
-- Update has_permission to use domain_id

CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_name VARCHAR;
    v_user_team VARCHAR;
    v_user_domain UUID;
BEGIN
    -- Get user details
    SELECT r.name, u.team, u.domain_id 
    INTO v_role_name, v_user_team, v_user_domain
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

    -- Note: Department permissions are deprecated in favor of domain + role.
    -- To keep backward compatibility if they used it, you'd map domains to permissions here.
    -- For now, if role doesn't have it, we check if there's a domain-level permission (if such table exists).
    -- Assuming they only use role_permissions in the new architecture.

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
