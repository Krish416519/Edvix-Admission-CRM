-- 00000000000128_lead_stage_distribution.sql

-- =============================================================
-- RPC function to get lead distribution across pipeline stages
-- Used by the "All Leads / Stage Overview" Smart View
-- Returns: total_leads (first row) + per-stage counts
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_lead_stage_distribution(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    stage_name VARCHAR,
    stage_count BIGINT,
    total_leads BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_is_admin BOOLEAN;
    v_total BIGINT;
BEGIN
    -- Determine if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = v_user_id AND r.name IN ('Super Admin', 'Admin')
    ) INTO v_is_admin;

    -- Get total count
    v_total := (
        SELECT COUNT(*)
        FROM public.leads l
        WHERE l.deleted_at IS NULL
          AND (v_is_admin OR l.assigned_counselor = v_user_id)
    );

    -- Return per-stage breakdown with total on every row
    RETURN QUERY
    WITH stage_counts AS (
        SELECT
            COALESCE(l.lead_status, 'New')::VARCHAR as stage_name,
            COUNT(*)::BIGINT as stage_count
        FROM public.leads l
        WHERE l.deleted_at IS NULL
          AND (v_is_admin OR l.assigned_counselor = v_user_id)
        GROUP BY l.lead_status
    )
    SELECT
        sc.stage_name,
        sc.stage_count,
        v_total
    FROM stage_counts sc
    ORDER BY sc.stage_name;

    -- If no leads exist at all, return empty result
    -- (total will be 0)
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_lead_stage_distribution TO authenticated;
