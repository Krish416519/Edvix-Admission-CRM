-- 00000000000004_finance_tables.sql
-- Creates university_payouts, partner_commissions, and ledger_entries tables
-- with RLS policies to persist all Finance module data.

--------------------------------------------------
-- 1. TABLES
--------------------------------------------------

CREATE TABLE public.university_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    university_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoice_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payout_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    payment_date TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subvention NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    university_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    partner_share NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commission_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reference_number VARCHAR(255),
    related_admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 2. TRIGGERS (auto-update updated_at)
--------------------------------------------------

CREATE TRIGGER set_updated_at_university_payouts
BEFORE UPDATE ON public.university_payouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_partner_commissions
BEFORE UPDATE ON public.partner_commissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ledger_entries
BEFORE UPDATE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------
-- 3. INDEXES
--------------------------------------------------

CREATE INDEX idx_university_payouts_admission_id ON public.university_payouts(admission_id);
CREATE INDEX idx_university_payouts_status ON public.university_payouts(payout_status);

CREATE INDEX idx_partner_commissions_admission_id ON public.partner_commissions(admission_id);
CREATE INDEX idx_partner_commissions_status ON public.partner_commissions(commission_status);

CREATE INDEX idx_ledger_entries_date ON public.ledger_entries(date);
CREATE INDEX idx_ledger_entries_related_admission_id ON public.ledger_entries(related_admission_id);

--------------------------------------------------
-- 4. RLS POLICIES
--------------------------------------------------

ALTER TABLE public.university_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- University Payouts
CREATE POLICY "Admins full access to university_payouts"
ON public.university_payouts FOR ALL USING (public.is_admin());

CREATE POLICY "Accounts can view and edit university_payouts"
ON public.university_payouts FOR ALL USING (public.user_role() = 'Accounts');

CREATE POLICY "Universities can view their own payouts"
ON public.university_payouts FOR SELECT USING (public.user_role() = 'University');

-- Partner Commissions
CREATE POLICY "Admins full access to partner_commissions"
ON public.partner_commissions FOR ALL USING (public.is_admin());

CREATE POLICY "Accounts can view and edit partner_commissions"
ON public.partner_commissions FOR ALL USING (public.user_role() = 'Accounts');

CREATE POLICY "Partners can view their own commissions"
ON public.partner_commissions FOR SELECT USING (public.user_role() = 'Partner');

-- Ledger Entries
CREATE POLICY "Admins full access to ledger_entries"
ON public.ledger_entries FOR ALL USING (public.is_admin());

CREATE POLICY "Accounts can view and manage ledger"
ON public.ledger_entries FOR ALL USING (public.user_role() = 'Accounts');
