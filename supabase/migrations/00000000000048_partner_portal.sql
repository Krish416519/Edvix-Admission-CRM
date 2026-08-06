-- =============================================================
-- 00000000000048_partner_portal.sql
-- Partner Portal Schema and Security Rules
-- =============================================================

-- 1. Create Partner Profiles Table
CREATE TABLE IF NOT EXISTS public.partner_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    partner_type VARCHAR(100) NOT NULL DEFAULT 'Freelancer', -- Education Consultant, Freelancer, Franchise, Referral Partner, Corporate Partner, University Partner
    tax_id VARCHAR(100),
    commission_tier VARCHAR(50) DEFAULT 'Standard',
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at for partner_profiles
CREATE TRIGGER set_updated_at_partner_profiles
    BEFORE UPDATE ON public.partner_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Modify Leads Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Partner RLS Policies

-- Partner Profiles: Users can read their own profile, Admins full access
CREATE POLICY "Users can view own partner profile" ON public.partner_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin full access partner_profiles" ON public.partner_profiles
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));

-- Leads: Partners can SELECT, INSERT, UPDATE their own leads
CREATE POLICY "Partners can view own leads" ON public.leads
    FOR SELECT USING (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can insert own leads" ON public.leads
    FOR INSERT WITH CHECK (public.user_role() = 'Partner' AND partner_id = auth.uid());

CREATE POLICY "Partners can update own leads" ON public.leads
    FOR UPDATE USING (public.user_role() = 'Partner' AND partner_id = auth.uid());

-- Admissions: Partners can SELECT admissions linked to their leads
CREATE POLICY "Partners can view own admissions" ON public.admissions
    FOR SELECT USING (
        public.user_role() = 'Partner' AND 
        lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid())
    );

-- Lead Activities: Partners can SELECT, INSERT activities for their leads
CREATE POLICY "Partners can view own lead activities" ON public.lead_activities
    FOR SELECT USING (
        public.user_role() = 'Partner' AND 
        lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid())
    );

CREATE POLICY "Partners can insert own lead activities" ON public.lead_activities
    FOR INSERT WITH CHECK (
        public.user_role() = 'Partner' AND 
        lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid())
    );

-- Commissions: Partners can SELECT their own commissions
CREATE POLICY "Partners can view own commissions" ON public.commissions
    FOR SELECT USING (
        public.user_role() = 'Partner' AND 
        recipient_id = auth.uid()
    );

-- Documents: Partners can SELECT, INSERT documents linked to their leads/admissions
CREATE POLICY "Partners can view own documents" ON public.documents
    FOR SELECT USING (
        public.user_role() = 'Partner' AND (
            lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid()) OR
            admission_id IN (SELECT id FROM public.admissions WHERE lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid()))
        )
    );

CREATE POLICY "Partners can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (
        public.user_role() = 'Partner' AND (
            lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid()) OR
            admission_id IN (SELECT id FROM public.admissions WHERE lead_id IN (SELECT id FROM public.leads WHERE partner_id = auth.uid()))
        )
    );
