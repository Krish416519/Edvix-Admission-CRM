-- =============================================================================
-- 00000000000096_partner_ecosystem.sql
-- Extension of Partner Portal: Tiers, KYC, Support, RLS
-- =============================================================================

--------------------------------------------------
-- STEP 1: PARTNER TIERS
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- Starter, Bronze, Silver, Gold, Platinum
    commission_multiplier NUMERIC(5,2) DEFAULT 1.00,
    benefits TEXT,
    requirements TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Default Tiers
INSERT INTO public.partner_tiers (name, commission_multiplier, benefits, requirements)
VALUES 
    ('Starter', 1.00, 'Basic access', 'Default for new partners'),
    ('Bronze', 1.10, 'Priority Support', '10+ Admissions'),
    ('Silver', 1.25, 'Dedicated Account Manager', '50+ Admissions'),
    ('Gold', 1.50, 'Co-marketing opportunities', '100+ Admissions'),
    ('Platinum', 2.00, 'Exclusive events', '500+ Admissions')
ON CONFLICT DO NOTHING;

--------------------------------------------------
-- STEP 2: EXPAND PARTNER PROFILES
--------------------------------------------------
ALTER TABLE public.partner_profiles 
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.partner_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'Not Started' CHECK (kyc_status IN ('Not Started', 'Submitted', 'Under Review', 'Verified', 'Rejected', 'Needs Update')),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS total_revenue_generated NUMERIC(14,2) DEFAULT 0.00;

-- Assign default tier to existing partners if null
UPDATE public.partner_profiles 
SET tier_id = (SELECT id FROM public.partner_tiers WHERE name = 'Starter' LIMIT 1)
WHERE tier_id IS NULL;

--------------------------------------------------
-- STEP 3: PARTNER KYC
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_kyc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- GST, PAN, Bank Details, Registration, ID Proof
    bucket_name VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Verified', 'Rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- STEP 4: PARTNER SUPPORT
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Commission, Lead Query, Technical, Other
    priority VARCHAR(50) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Waiting on Partner', 'Closed', 'Resolved')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.partner_support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- STEP 5: TRIGGERS & FUNCTIONS
--------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'partner_support_tickets' AND (NEW.ticket_number = '' OR NEW.ticket_number IS NULL) THEN
        NEW.ticket_number := 'TKT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_ticket_number BEFORE INSERT ON public.partner_support_tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

CREATE TRIGGER set_updated_at_partner_tiers BEFORE UPDATE ON public.partner_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_partner_kyc BEFORE UPDATE ON public.partner_kyc FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_partner_support_tickets BEFORE UPDATE ON public.partner_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 6: STRICT ROW LEVEL SECURITY (RLS)
--------------------------------------------------
ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_support_messages ENABLE ROW LEVEL SECURITY;

-- 6.1 Admin Full Access
CREATE POLICY "Admin full access partner_tiers" ON public.partner_tiers FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Partner Manager'));
CREATE POLICY "Admin full access partner_kyc" ON public.partner_kyc FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Partner Manager', 'Accounts'));
CREATE POLICY "Admin full access partner_support_tickets" ON public.partner_support_tickets FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Partner Manager', 'Support'));
CREATE POLICY "Admin full access partner_support_messages" ON public.partner_support_messages FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Partner Manager', 'Support'));

-- 6.2 Partner Isolation
CREATE POLICY "Partners can view partner_tiers" ON public.partner_tiers
    FOR SELECT USING (public.user_role() = 'Partner');

CREATE POLICY "Partners can view own partner_kyc" ON public.partner_kyc
    FOR SELECT USING (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can insert own partner_kyc" ON public.partner_kyc
    FOR INSERT WITH CHECK (public.user_role() = 'Partner' AND partner_id = auth.uid());

-- Only admins can update KYC (verify/reject)
-- CREATE POLICY "Partners can update own partner_kyc" ... Intentionally omitted.

CREATE POLICY "Partners can view own support tickets" ON public.partner_support_tickets
    FOR SELECT USING (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can insert own support tickets" ON public.partner_support_tickets
    FOR INSERT WITH CHECK (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can update own support tickets" ON public.partner_support_tickets
    FOR UPDATE USING (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can view own support messages" ON public.partner_support_messages
    FOR SELECT USING (public.user_role() = 'Partner' AND ticket_id IN (SELECT id FROM public.partner_support_tickets WHERE partner_id = auth.uid()));

CREATE POLICY "Partners can insert own support messages" ON public.partner_support_messages
    FOR INSERT WITH CHECK (public.user_role() = 'Partner' AND ticket_id IN (SELECT id FROM public.partner_support_tickets WHERE partner_id = auth.uid()) AND sender_id = auth.uid());

-- 6.3 Financial Protections Extension
-- We already have SELECT on commissions in 00000000000048_partner_portal.sql
-- Adding ledger_entries view for partners explicitly referencing their admissions/payments
CREATE POLICY "Partners can view own ledger entries" ON public.ledger_entries
    FOR SELECT USING (
        public.user_role() = 'Partner' AND (
            related_admission_id IN (SELECT id FROM public.admissions WHERE lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid()))
        )
    );

--------------------------------------------------
-- STEP 7: GRANTS
--------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_kyc TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_support_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ticket_number_seq TO authenticated;

--------------------------------------------------
-- STEP 8: REALTIME
--------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_support_messages;
