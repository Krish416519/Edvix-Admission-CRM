-- =============================================================================
-- 00000000000090_auto_assign_leads.sql
-- Auto-assign unassigned incoming leads via Round-Robin
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_selected_counselor UUID;
BEGIN
    -- Only trigger if the lead is currently unassigned
    IF NEW.assigned_counselor IS NULL THEN
        -- Find the active Counselor who was least recently assigned a lead via Round Robin
        SELECT u.id INTO v_selected_counselor
        FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.is_active = TRUE AND r.name = 'Counselor'
        ORDER BY (
            SELECT MAX(created_at) 
            FROM public.lead_assignments la 
            WHERE la.assignee_id = u.id AND la.assignment_type = 'Round Robin'
        ) ASC NULLS FIRST, u.created_at ASC
        LIMIT 1;

        -- If a counselor is found, use the existing system to assign and notify them
        IF v_selected_counselor IS NOT NULL THEN
            PERFORM public.assign_lead(
                NEW.id,
                v_selected_counselor,
                NULL, -- Assigned by system
                'Auto Assigned via Round Robin',
                'Round Robin'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_lead ON public.leads;

CREATE TRIGGER trg_auto_assign_lead
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_lead();
