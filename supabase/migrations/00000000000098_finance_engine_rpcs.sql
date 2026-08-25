-- =============================================================================
-- 00000000000098_finance_engine_rpcs.sql
-- Step 35: Advanced Finance Engine RPCs
-- Implements Commission Calculation, Refunds, and Payout Batch Generation
-- =============================================================================

--------------------------------------------------
-- 1. CALCULATE COMMISSION (RPC)
--------------------------------------------------
-- This function is called when a payment transitions to 'Paid'.
-- It calculates commissions for Partners and Counselors based on active rules.
CREATE OR REPLACE FUNCTION public.calculate_commission(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_payment RECORD;
    v_admission RECORD;
    v_rule RECORD;
    v_commission_amount NUMERIC(12, 2);
    v_partner_tier VARCHAR(50);
BEGIN
    -- Fetch payment details
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Ensure payment is Paid
    IF v_payment.status != 'Paid' THEN
        RETURN; -- Only calculate on paid amounts
    END IF;

    -- Fetch admission details
    SELECT a.*, p.role as partner_role -- Assuming user's table has role/tier info, adjust if needed
    INTO v_admission 
    FROM public.admissions a
    LEFT JOIN public.users p ON a.partner_id = p.id
    WHERE a.id = v_payment.admission_id;

    IF NOT FOUND THEN
        RETURN; -- No admission tied to this payment
    END IF;

    -- Note: This assumes `partner_tier` might exist in users metadata, fallback to generic if not
    -- For this CRM, we assume partner tier can be derived or is generic for now.
    v_partner_tier := 'Standard'; 

    --------------------------------------------------
    -- A. PARTNER COMMISSION
    --------------------------------------------------
    IF v_admission.partner_id IS NOT NULL THEN
        -- Find the best matching rule for the partner
        SELECT * INTO v_rule
        FROM public.commission_rules
        WHERE target_role = 'Partner'
          AND is_active = TRUE
          AND (university_id = v_admission.university_id OR university_id IS NULL)
          AND (course_id = v_admission.course_id OR course_id IS NULL)
          AND (target_tier = v_partner_tier OR target_tier IS NULL)
          AND (effective_from <= v_payment.payment_date OR v_payment.payment_date IS NULL)
          AND (effective_to IS NULL OR effective_to >= v_payment.payment_date)
        ORDER BY 
          -- Prioritize more specific rules
          (CASE WHEN university_id IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN course_id IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN target_tier IS NOT NULL THEN 1 ELSE 0 END) DESC
        LIMIT 1;

        IF FOUND THEN
            -- Calculate amount
            IF v_rule.percentage > 0 THEN
                v_commission_amount := (v_payment.net_amount * v_rule.percentage) / 100;
            ELSE
                v_commission_amount := v_rule.fixed_amount;
            END IF;

            -- Check if a commission already exists to avoid duplicates
            IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE payment_id = p_payment_id AND recipient_id = v_admission.partner_id) THEN
                INSERT INTO public.commissions (
                    admission_id, payment_id, rule_id, recipient_id, recipient_type, 
                    commission_percentage, commission_amount, net_commission, status
                ) VALUES (
                    v_admission.id, p_payment_id, v_rule.id, v_admission.partner_id, 'Partner',
                    v_rule.percentage, v_commission_amount, v_commission_amount, 'Pending'
                );
            END IF;
        END IF;
    END IF;

    --------------------------------------------------
    -- B. COUNSELOR INCENTIVE (Optional based on rules)
    --------------------------------------------------
    IF v_admission.counselor_id IS NOT NULL THEN
        -- Find the best matching rule for the counselor
        SELECT * INTO v_rule
        FROM public.commission_rules
        WHERE target_role = 'Counselor'
          AND is_active = TRUE
          AND (university_id = v_admission.university_id OR university_id IS NULL)
          AND (effective_from <= v_payment.payment_date OR v_payment.payment_date IS NULL)
          AND (effective_to IS NULL OR effective_to >= v_payment.payment_date)
        ORDER BY (CASE WHEN university_id IS NOT NULL THEN 1 ELSE 0 END) DESC
        LIMIT 1;

        IF FOUND THEN
            IF v_rule.percentage > 0 THEN
                v_commission_amount := (v_payment.net_amount * v_rule.percentage) / 100;
            ELSE
                v_commission_amount := v_rule.fixed_amount;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE payment_id = p_payment_id AND recipient_id = v_admission.counselor_id) THEN
                INSERT INTO public.commissions (
                    admission_id, payment_id, rule_id, recipient_id, recipient_type, 
                    commission_percentage, commission_amount, net_commission, status
                ) VALUES (
                    v_admission.id, p_payment_id, v_rule.id, v_admission.counselor_id, 'Counselor',
                    v_rule.percentage, v_commission_amount, v_commission_amount, 'Pending'
                );
            END IF;
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--------------------------------------------------
-- 2. TRIGGER FOR PAYMENT STATUS CHANGE
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_process_payment_commissions()
RETURNS TRIGGER AS $$
BEGIN
    -- If marked as paid, run commission calculation
    IF NEW.status = 'Paid' AND (TG_OP = 'INSERT' OR OLD.status != 'Paid') THEN
        PERFORM public.calculate_commission(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_commissions ON public.payments;
CREATE TRIGGER trg_payment_commissions
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_process_payment_commissions();


--------------------------------------------------
-- 3. PROCESS REFUND (RPC)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_refund(
    p_payment_id UUID, 
    p_amount NUMERIC, 
    p_reason TEXT,
    p_requested_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_payment RECORD;
    v_refund_id UUID;
    v_total_refunded NUMERIC;
BEGIN
    -- Validate payment
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Calculate total already refunded
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded 
    FROM public.refunds 
    WHERE payment_id = p_payment_id AND status IN ('Approved', 'Processing', 'Completed');

    -- Ensure refund doesn't exceed net amount
    IF (v_total_refunded + p_amount) > v_payment.net_amount THEN
        RAISE EXCEPTION 'Refund amount exceeds remaining payment balance';
    END IF;

    -- Create refund record
    INSERT INTO public.refunds (
        payment_id, admission_id, amount, reason, status, requested_by
    ) VALUES (
        p_payment_id, v_payment.admission_id, p_amount, p_reason, 'Requested', p_requested_by
    ) RETURNING id INTO v_refund_id;

    -- Update payment status if full refund
    IF (v_total_refunded + p_amount) >= v_payment.net_amount THEN
        UPDATE public.payments SET status = 'Refunded' WHERE id = p_payment_id;
    END IF;

    -- If there are pending commissions for this payment, mark them as Cancelled
    -- If they are already paid, we would ideally create a negative adjustment (omitted for brevity here)
    UPDATE public.commissions 
    SET status = 'Cancelled' 
    WHERE payment_id = p_payment_id AND status = 'Pending';

    RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--------------------------------------------------
-- 4. GENERATE PAYOUT BATCH (RPC)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_payout_batch(
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_batch_id UUID;
    v_total NUMERIC := 0;
    v_count INTEGER := 0;
BEGIN
    -- Create the draft batch
    INSERT INTO public.payout_batches (
        period_start, period_end, status, created_by
    ) VALUES (
        p_period_start, p_period_end, 'Draft', p_created_by
    ) RETURNING id INTO v_batch_id;

    -- Assign pending approved commissions to this batch
    UPDATE public.commissions
    SET payout_batch_id = v_batch_id, status = 'Approved'
    WHERE status = 'Pending' 
      AND created_at >= p_period_start 
      AND created_at <= p_period_end;

    -- Calculate totals
    SELECT COALESCE(SUM(net_commission), 0), COUNT(id)
    INTO v_total, v_count
    FROM public.commissions
    WHERE payout_batch_id = v_batch_id;

    -- Update batch with totals
    UPDATE public.payout_batches
    SET total_amount = v_total, recipient_count = v_count
    WHERE id = v_batch_id;

    RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
