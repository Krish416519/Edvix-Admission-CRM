-- =============================================================================
-- 00000000000097_advanced_finance.sql
-- Step 35: Advanced Finance Schema Extensions
-- Implements Idempotency, Batches, Bank Details, Disputes, Reconciliations
-- =============================================================================

--------------------------------------------------
-- 1. IDEMPOTENCY & WEBHOOKS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL, -- e.g., 'stripe_webhook', 'razorpay_webhook', 'manual_adjustment'
    related_transaction_id UUID, -- If it resulted in a payment or ledger entry
    status VARCHAR(50) NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing', 'Completed', 'Failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX idx_idempotency_keys_value ON public.idempotency_keys(key_value);

CREATE TABLE IF NOT EXISTS public.webhook_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_events_log_event_id ON public.webhook_events_log(event_id);


--------------------------------------------------
-- 2. VERSIONED COMMISSION RULES
--------------------------------------------------
-- Extend existing commission_rules table to support historical integrity
ALTER TABLE public.commission_rules
ADD COLUMN IF NOT EXISTS target_tier VARCHAR(50), -- e.g., 'Silver', 'Gold', 'Platinum'
ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ;

-- Add triggers to ensure date overlap checks could be added later if needed.


--------------------------------------------------
-- 3. PAYOUT BATCHES & APPROVALS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' 
           CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Processing', 'Paid', 'Failed', 'Cancelled')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payout_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.payout_batches(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL, -- 'Finance Executive', 'Finance Manager', 'Super Admin'
    action VARCHAR(50) NOT NULL CHECK (action IN ('Approved', 'Rejected')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link commissions to a batch
ALTER TABLE public.commissions
ADD COLUMN IF NOT EXISTS payout_batch_id UUID REFERENCES public.payout_batches(id) ON DELETE SET NULL;

ALTER TABLE public.university_payouts
ADD COLUMN IF NOT EXISTS payout_batch_id UUID REFERENCES public.payout_batches(id) ON DELETE SET NULL;


--------------------------------------------------
-- 4. PARTNER BANK DETAILS (SECURE)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(255) NOT NULL, -- In production, consider encrypting this at the app layer
    bank_name VARCHAR(255) NOT NULL,
    ifsc_code VARCHAR(50),
    swift_code VARCHAR(50),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Verification' 
           CHECK (status IN ('Pending Verification', 'Verified', 'Rejected', 'Change Requested')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_unique_verified_bank ON public.partner_bank_details(partner_id) WHERE status = 'Verified';


--------------------------------------------------
-- 5. FINANCIAL DISPUTES
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number VARCHAR(50) UNIQUE NOT NULL,
    raised_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    related_transaction_type VARCHAR(50) NOT NULL, -- 'Payment', 'Commission', 'Payout'
    related_transaction_id UUID NOT NULL,
    amount_disputed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Open' 
           CHECK (status IN ('Open', 'Under Review', 'Waiting for Information', 'Approved', 'Rejected', 'Resolved', 'Escalated')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--------------------------------------------------
-- 6. RECONCILIATION EXCEPTIONS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exception_type VARCHAR(100) NOT NULL, -- 'Missing Payment', 'Amount Mismatch', 'Unsettled Payout'
    source_record_id VARCHAR(255) NOT NULL, -- e.g., Gateway Transaction ID
    internal_record_id UUID, -- e.g., CRM payment_id if matched
    source_amount NUMERIC(12, 2),
    internal_amount NUMERIC(12, 2),
    difference_amount NUMERIC(12, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Ignored', 'Resolved')),
    notes TEXT,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--------------------------------------------------
-- 7. AUTO-NUMBER GENERATION TRIGGERS
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_advanced_finance_numbers()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'payout_batches' AND (NEW.batch_number IS NULL OR NEW.batch_number = '') THEN
        NEW.batch_number := 'BAT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(floor(random() * 1000000)::TEXT, 6, '0');
    ELSIF TG_TABLE_NAME = 'financial_disputes' AND (NEW.dispute_number IS NULL OR NEW.dispute_number = '') THEN
        NEW.dispute_number := 'DSP-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(floor(random() * 1000000)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_batch_number BEFORE INSERT ON public.payout_batches FOR EACH ROW EXECUTE FUNCTION public.generate_advanced_finance_numbers();
CREATE TRIGGER trg_generate_dispute_number BEFORE INSERT ON public.financial_disputes FOR EACH ROW EXECUTE FUNCTION public.generate_advanced_finance_numbers();

-- Auto updated_at triggers
CREATE TRIGGER set_updated_at_batches BEFORE UPDATE ON public.payout_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_bank_details BEFORE UPDATE ON public.partner_bank_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_disputes BEFORE UPDATE ON public.financial_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_reconciliation BEFORE UPDATE ON public.reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
