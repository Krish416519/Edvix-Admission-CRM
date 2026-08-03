-- =============================================================================
-- 00000000000013_finance_module.sql
-- Production-ready Finance & Payments Module for Edvix AI CRM
-- =============================================================================

--------------------------------------------------
-- STEP 1: DROP OLD FINANCE TABLES
--------------------------------------------------
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.university_payouts CASCADE;
DROP TABLE IF EXISTS public.partner_commissions CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;

--------------------------------------------------
-- STEP 2: SEQUENCES
--------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.ledger_entry_seq START 1;

--------------------------------------------------
-- STEP 3: CORE TABLES
--------------------------------------------------

-- 3.1 INVOICES
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
    
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' 
           CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Cancelled')),
    
    issue_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 INVOICE ITEMS
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    
    fee_category VARCHAR(100) NOT NULL,
    description TEXT,
    
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 PAYMENTS
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
    
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    
    fee_category VARCHAR(100) NOT NULL,
    
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    scholarship NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    gateway_reference VARCHAR(255),
    
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' 
           CHECK (status IN ('Pending', 'Partially Paid', 'Paid', 'Failed', 'Cancelled', 'Refunded')),
    
    payment_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    collected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    remarks TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 PAYMENT RECEIPTS (Storage links)
CREATE TABLE public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    bucket_name VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 PAYMENT INSTALLMENTS
CREATE TABLE public.payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    
    installment_number INTEGER NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date TIMESTAMPTZ NOT NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 LEDGER ENTRIES
CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
    
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    
    debit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    
    reference_type VARCHAR(100), -- 'Payment', 'Refund', 'Payout', 'Adjustment'
    reference_id UUID,           -- e.g. payment_id
    related_admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 COMMISSION RULES
CREATE TABLE public.commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    target_role VARCHAR(50) NOT NULL, -- 'Partner', 'Counselor'
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    fixed_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 COMMISSIONS
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    
    recipient_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_type VARCHAR(50) NOT NULL, -- 'Partner', 'Counselor'
    
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subvention NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Cancelled')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 UNIVERSITY PAYOUTS
CREATE TABLE public.university_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    
    invoice_number VARCHAR(100),
    invoice_date TIMESTAMPTZ,
    
    expected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    invoice_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    
    payout_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (payout_status IN ('Pending', 'Processed', 'Disputed')),
    payment_date TIMESTAMPTZ,
    
    invoice_bucket VARCHAR(100),
    invoice_path TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.10 REFUNDS
CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'Processing', 'Completed', 'Rejected')),
    
    requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    ledger_entry_id UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 FINANCIAL ADJUSTMENTS
CREATE TABLE public.financial_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('Credit', 'Debit', 'Waiver')),
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--------------------------------------------------
-- STEP 4: TRIGGERS & FUNCTIONS
--------------------------------------------------

-- Auto-generate Numbers
CREATE OR REPLACE FUNCTION public.generate_finance_numbers()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'invoices' AND (NEW.invoice_number = '' OR NEW.invoice_number IS NULL) THEN
        NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
    ELSIF TG_TABLE_NAME = 'payments' AND (NEW.payment_number = '' OR NEW.payment_number IS NULL) THEN
        NEW.payment_number := 'PAY-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('public.payment_number_seq')::TEXT, 6, '0');
    ELSIF TG_TABLE_NAME = 'ledger_entries' AND (NEW.entry_number = '' OR NEW.entry_number IS NULL) THEN
        NEW.entry_number := 'LED-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('public.ledger_entry_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.generate_finance_numbers();
CREATE TRIGGER trg_generate_payment_number BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.generate_finance_numbers();
CREATE TRIGGER trg_generate_ledger_number BEFORE INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.generate_finance_numbers();

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_payment_installments BEFORE UPDATE ON public.payment_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_commissions BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_university_payouts BEFORE UPDATE ON public.university_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_refunds BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto Ledger Entry on Payment
CREATE OR REPLACE FUNCTION public.log_payment_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_last_balance NUMERIC(14, 2);
    v_user_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'Paid' THEN
        -- Get last balance
        SELECT balance INTO v_last_balance FROM public.ledger_entries ORDER BY created_at DESC LIMIT 1;
        v_last_balance := COALESCE(v_last_balance, 0.00);
        
        -- Create ledger entry (Credit)
        INSERT INTO public.ledger_entries (
            date, description, debit, credit, balance, reference_type, reference_id, related_admission_id, created_by
        ) VALUES (
            NOW(), 'Payment Received: ' || NEW.payment_number, 0.00, NEW.net_amount, v_last_balance + NEW.net_amount, 'Payment', NEW.id, NEW.admission_id, NEW.collected_by
        );
        
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Paid' AND OLD.status != 'Paid' THEN
        -- Get last balance
        SELECT balance INTO v_last_balance FROM public.ledger_entries ORDER BY created_at DESC LIMIT 1;
        v_last_balance := COALESCE(v_last_balance, 0.00);
        
        -- Create ledger entry (Credit)
        INSERT INTO public.ledger_entries (
            date, description, debit, credit, balance, reference_type, reference_id, related_admission_id, created_by
        ) VALUES (
            NOW(), 'Payment Received: ' || NEW.payment_number, 0.00, NEW.net_amount, v_last_balance + NEW.net_amount, 'Payment', NEW.id, NEW.admission_id, NEW.collected_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_payment_to_ledger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_payment_to_ledger();

-- Activity Timeline Logging
CREATE OR REPLACE FUNCTION public.log_finance_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_lead_id UUID;
    v_activity_type VARCHAR;
    v_content TEXT;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
    
    IF TG_TABLE_NAME = 'payments' THEN
        v_lead_id := NEW.lead_id;
        IF v_lead_id IS NULL AND NEW.admission_id IS NOT NULL THEN
            SELECT lead_id INTO v_lead_id FROM public.admissions WHERE id = NEW.admission_id;
        END IF;

        IF v_lead_id IS NOT NULL THEN
            IF TG_OP = 'INSERT' THEN
                v_activity_type := 'status_change'; -- or a new 'payment' type if UI supports it
                v_content := 'Payment recorded: ' || NEW.payment_number || ' (' || NEW.status || ')';
                INSERT INTO public.lead_activities (lead_id, type, content, author, metadata) VALUES (v_lead_id, v_activity_type, v_content, COALESCE(v_user_name, 'System'), jsonb_build_object('payment_id', NEW.id));
            ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
                v_activity_type := 'status_change';
                v_content := 'Payment ' || NEW.payment_number || ' marked as ' || NEW.status;
                INSERT INTO public.lead_activities (lead_id, type, content, author, metadata) VALUES (v_lead_id, v_activity_type, v_content, COALESCE(v_user_name, 'System'), jsonb_build_object('payment_id', NEW.id));
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_finance_activity AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_finance_activity();

--------------------------------------------------
-- STEP 5: INDEXES
--------------------------------------------------
CREATE INDEX idx_payments_admission_id ON public.payments(admission_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_invoices_admission_id ON public.invoices(admission_id);
CREATE INDEX idx_ledger_entries_reference_id ON public.ledger_entries(reference_id);
CREATE INDEX idx_commissions_admission_id ON public.commissions(admission_id);
CREATE INDEX idx_university_payouts_admission_id ON public.university_payouts(admission_id);
CREATE INDEX idx_refunds_payment_id ON public.refunds(payment_id);

--------------------------------------------------
-- STEP 6: VIEWS for Reports
--------------------------------------------------
CREATE OR REPLACE VIEW public.revenue_summary AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    SUM(net_amount) AS total_revenue
FROM public.payments
WHERE status = 'Paid'
GROUP BY DATE_TRUNC('month', created_at);

--------------------------------------------------
-- STEP 7: ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_adjustments ENABLE ROW LEVEL SECURITY;

-- Admins & Accounts get full access to everything
CREATE POLICY "Admins and Accounts full access payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin() OR public.user_role() = 'Accounts');
CREATE POLICY "Admins and Accounts full access ledger" ON public.ledger_entries FOR ALL TO authenticated USING (public.is_admin() OR public.user_role() = 'Accounts');
CREATE POLICY "Admins and Accounts full access payouts" ON public.university_payouts FOR ALL TO authenticated USING (public.is_admin() OR public.user_role() = 'Accounts');
CREATE POLICY "Admins and Accounts full access commissions" ON public.commissions FOR ALL TO authenticated USING (public.is_admin() OR public.user_role() = 'Accounts');
CREATE POLICY "Admins and Accounts full access invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_admin() OR public.user_role() = 'Accounts');

-- Counselors read-only for their own leads' payments & invoices
CREATE POLICY "Counselors view payments for their leads" ON public.payments FOR SELECT TO authenticated 
USING (public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid()));

CREATE POLICY "Counselors view invoices for their leads" ON public.invoices FOR SELECT TO authenticated 
USING (public.user_role() = 'Counselor' AND lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid()));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;

--------------------------------------------------
-- STEP 8: REALTIME
--------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.university_payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
