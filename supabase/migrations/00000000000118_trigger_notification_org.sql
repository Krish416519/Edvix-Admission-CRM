-- =============================================================================
-- 00000000000118_trigger_notification_org.sql
-- Automatically set organization_id for client-side inserts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_set_notification_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        SELECT organization_id INTO NEW.organization_id
        FROM public.organization_users
        WHERE user_id = NEW.recipient_id
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_notification_org ON public.notifications;

CREATE TRIGGER trigger_set_notification_org
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_set_notification_org_id();
