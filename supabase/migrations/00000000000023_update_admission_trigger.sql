-- Migration: Update admissions trigger to use correct column names
-- The leads table was renamed:
--   full_name → first_name
-- The trigger previously referenced NEW.full_name, which no longer exists.
-- This migration recreates the function with the proper column names.

CREATE OR REPLACE FUNCTION public.notify_admission_changes()
RETURNS TRIGGER AS $$
DECLARE v_counselor UUID; v_lead_name TEXT;
BEGIN
    -- Get assigned counselor and lead's first name
    SELECT assigned_counselor, first_name INTO v_counselor, v_lead_name FROM public.leads WHERE id = NEW.lead_id;

    IF TG_OP = 'INSERT' AND v_counselor IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(
            v_counselor,
            'Admissions',
            NEW.id,
            'Admission Created',
            'Admission ' || NEW.admission_number || ' created for ' || v_lead_name,
            'general'
        );
    ELSIF TG_OP = 'UPDATE' AND NEW.current_stage IS DISTINCT FROM OLD.current_stage AND v_counselor IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(
            v_counselor,
            'Admissions',
            NEW.id,
            'Admission Stage Updated',
            'Admission ' || NEW.admission_number || ' moved to ' || NEW.current_stage,
            'general'
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (will replace if exists)
DROP TRIGGER IF EXISTS trg_notify_admission_changes ON public.admissions;
CREATE TRIGGER trg_notify_admission_changes AFTER INSERT OR UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.notify_admission_changes();
