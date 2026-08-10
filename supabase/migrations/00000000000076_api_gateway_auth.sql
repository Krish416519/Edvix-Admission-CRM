-- 00000000000076_api_gateway_auth.sql
-- Update is_member_of to support API Key custom JWTs

CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_jwt_org_id TEXT;
BEGIN
    -- 1. Check if this is an API Key request (has organization_id in JWT claims)
    -- The Edge Function api-gateway signs a custom JWT with the API Key's organization_id
    v_jwt_org_id := current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id';
    
    IF v_jwt_org_id IS NOT NULL AND v_jwt_org_id = org_id::TEXT THEN
        RETURN TRUE;
    END IF;

    -- 2. Platform Super Admins bypass
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_platform_super_admin = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- 3. Check normal user membership
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users 
        WHERE user_id = auth.uid() 
        AND organization_id = org_id 
        AND status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
