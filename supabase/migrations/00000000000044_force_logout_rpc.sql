-- 00000000000044_force_logout_rpc.sql
-- Create an RPC to force logout a user by deleting their sessions and refresh tokens

CREATE OR REPLACE FUNCTION public.admin_force_logout(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
BEGIN
    -- Only Super Admin or Admin can do this
    v_caller_role := public.user_role();
    
    IF v_caller_role NOT IN ('Super Admin', 'Admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
    END IF;

    -- Delete sessions and refresh tokens from auth schema
    DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = p_user_id);
    DELETE FROM auth.sessions WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_force_logout TO authenticated;