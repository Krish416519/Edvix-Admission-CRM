CREATE OR REPLACE FUNCTION public.eval_sql()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    res jsonb;
BEGIN
    SELECT jsonb_agg(row_to_json(t)) INTO res FROM (
        SELECT u.email, r.name as role_name 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE r.name IN ('Super Admin', 'Admin')
    ) t;
    RETURN res;
END;
$$;
GRANT EXECUTE ON FUNCTION public.eval_sql() TO anon;
