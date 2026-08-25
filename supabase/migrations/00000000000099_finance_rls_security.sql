-- =============================================================================
-- 00000000000099_finance_rls_security.sql
-- Step 35: Finance Advanced RLS Security
-- Implements Immutability Constraints and Partner Privacy
-- =============================================================================

--------------------------------------------------
-- 1. ENABLE RLS
--------------------------------------------------
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_exceptions ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- 2. PARTNER BANK DETAILS
--------------------------------------------------
-- Partners can manage their own bank details
CREATE POLICY "Partners manage their own bank details" ON public.partner_bank_details
FOR ALL TO authenticated
USING (partner_id = auth.uid() OR public.is_admin() OR public.user_role() = 'Accounts');

-- Force status to 'Pending Verification' if a partner updates their details
CREATE OR REPLACE FUNCTION public.force_bank_detail_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF public.user_role() = 'Partner' THEN
        NEW.status := 'Pending Verification';
        NEW.verified_at := NULL;
        NEW.verified_by := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_force_bank_verification
    BEFORE INSERT OR UPDATE ON public.partner_bank_details
    FOR EACH ROW EXECUTE FUNCTION public.force_bank_detail_verification();


--------------------------------------------------
-- 3. FINANCIAL DISPUTES
--------------------------------------------------
-- Partners can view and raise their own disputes
CREATE POLICY "Partners view own disputes" ON public.financial_disputes
FOR SELECT TO authenticated
USING (raised_by = auth.uid() OR public.is_admin() OR public.user_role() = 'Accounts');

CREATE POLICY "Partners insert own disputes" ON public.financial_disputes
FOR INSERT TO authenticated
WITH CHECK (raised_by = auth.uid() OR public.is_admin() OR public.user_role() = 'Accounts');


--------------------------------------------------
-- 4. PAYOUT BATCHES & APPROVALS
--------------------------------------------------
-- Admins & Accounts have full control. Partners have NO access.
CREATE POLICY "Admins and Accounts control payout batches" ON public.payout_batches
FOR ALL TO authenticated
USING (public.is_admin() OR public.user_role() = 'Accounts');

CREATE POLICY "Admins and Accounts control payout approvals" ON public.payout_approvals
FOR ALL TO authenticated
USING (public.is_admin() OR public.user_role() = 'Accounts');


--------------------------------------------------
-- 5. RECONCILIATION & IDEMPOTENCY (INTERNAL ONLY)
--------------------------------------------------
CREATE POLICY "System internal only idempotency" ON public.idempotency_keys
FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "System internal only webhooks" ON public.webhook_events_log
FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "Finance internal only reconciliation" ON public.reconciliation_exceptions
FOR ALL TO authenticated
USING (public.is_admin() OR public.user_role() = 'Accounts');


--------------------------------------------------
-- 6. STRICT IMMUTABILITY ENFORCEMENT
--------------------------------------------------
-- Explicitly block DELETE on critical finance tables even for admins
CREATE OR REPLACE FUNCTION public.prevent_finance_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Deletion of financial records is strictly prohibited. Create an adjustment or reversal entry instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_delete BEFORE DELETE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_deletion();
CREATE TRIGGER prevent_payment_delete BEFORE DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_deletion();
CREATE TRIGGER prevent_commission_delete BEFORE DELETE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_deletion();
CREATE TRIGGER prevent_refund_delete BEFORE DELETE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_deletion();


--------------------------------------------------
-- 7. RE-VERIFY PARTNER COMMISSIONS ACCESS
--------------------------------------------------
-- Ensure partners can read but NOT write to their commissions
DROP POLICY IF EXISTS "Partners can view their own commissions" ON public.partner_commissions; -- drop old if any
DROP POLICY IF EXISTS "Partners view own commissions" ON public.commissions;

CREATE POLICY "Partners view own commissions" ON public.commissions
FOR SELECT TO authenticated
USING (recipient_id = auth.uid() OR public.is_admin() OR public.user_role() = 'Accounts');

-- Ensure partners can never update their commission amounts
CREATE OR REPLACE FUNCTION public.prevent_partner_commission_update()
RETURNS TRIGGER AS $$
BEGIN
    IF public.user_role() = 'Partner' THEN
        RAISE EXCEPTION 'Partners are not authorized to modify commission records.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_partner_commission_update
    BEFORE UPDATE ON public.commissions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_commission_update();
