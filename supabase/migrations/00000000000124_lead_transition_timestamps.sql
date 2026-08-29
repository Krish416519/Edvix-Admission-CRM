-- 00000000000124_lead_transition_timestamps.sql

-- 1. Add transition timestamp columns to the leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS transition_to_fallout_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_to_counselled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_to_ob_initiated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_to_offer_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_to_converted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transition_to_screening_at TIMESTAMPTZ;

-- 2. Backfill existing leads based on current lead_status
UPDATE public.leads
SET 
  transition_to_fallout_at = CASE WHEN lead_status = 'Cold' THEN COALESCE(updated_at, created_at) ELSE transition_to_fallout_at END,
  transition_to_counselled_at = CASE WHEN lead_status = 'Hot' THEN COALESCE(updated_at, created_at) ELSE transition_to_counselled_at END,
  transition_to_ob_initiated_at = CASE WHEN lead_status = 'Application' THEN COALESCE(updated_at, created_at) ELSE transition_to_ob_initiated_at END,
  transition_to_offer_at = CASE WHEN lead_status = 'Qualified' THEN COALESCE(updated_at, created_at) ELSE transition_to_offer_at END,
  transition_to_converted_at = CASE WHEN lead_status = 'Admitted' THEN COALESCE(updated_at, created_at) ELSE transition_to_converted_at END,
  transition_to_screening_at = CASE WHEN lead_status = 'Docs Pending' THEN COALESCE(updated_at, created_at) ELSE transition_to_screening_at END;

-- 3. Create a function to set transition timestamps on status changes
CREATE OR REPLACE FUNCTION public.set_transition_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- transition_to_fallout_at: set when lead becomes Cold (no longer reachable)
    IF NEW.lead_status = 'Cold' AND OLD.lead_status != 'Cold' THEN
        IF NEW.transition_to_fallout_at IS NULL THEN
            NEW.transition_to_fallout_at := NOW();
        END IF;
    END IF;

    -- transition_to_counselled_at: set when lead becomes Hot (interested/engaged)
    IF NEW.lead_status = 'Hot' AND OLD.lead_status != 'Hot' THEN
        IF NEW.transition_to_counselled_at IS NULL THEN
            NEW.transition_to_counselled_at := NOW();
        END IF;
    END IF;

    -- transition_to_ob_initiated_at: set when lead enters Application stage
    IF NEW.lead_status = 'Application' AND OLD.lead_status != 'Application' THEN
        IF NEW.transition_to_ob_initiated_at IS NULL THEN
            NEW.transition_to_ob_initiated_at := NOW();
        END IF;
    END IF;

    -- transition_to_offer_at: set when lead becomes Qualified
    IF NEW.lead_status = 'Qualified' AND OLD.lead_status != 'Qualified' THEN
        IF NEW.transition_to_offer_at IS NULL THEN
            NEW.transition_to_offer_at := NOW();
        END IF;
    END IF;

    -- transition_to_converted_at: set when lead becomes Admitted (converted)
    IF NEW.lead_status = 'Admitted' AND OLD.lead_status != 'Admitted' THEN
        IF NEW.transition_to_converted_at IS NULL THEN
            NEW.transition_to_converted_at := NOW();
        END IF;
    END IF;

    -- transition_to_screening_at: set when lead reaches Docs Pending
    IF NEW.lead_status = 'Docs Pending' AND OLD.lead_status != 'Docs Pending' THEN
        IF NEW.transition_to_screening_at IS NULL THEN
            NEW.transition_to_screening_at := NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS trg_set_transition_timestamps ON public.leads;
CREATE TRIGGER trg_set_transition_timestamps
    BEFORE UPDATE OF lead_status ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_transition_timestamps();

-- 5. Expose the columns in the existing lead_status_stage_logging trigger (already created in migration 0123)
-- This ensures transition timestamps are set in sync with stage transition activity logs
