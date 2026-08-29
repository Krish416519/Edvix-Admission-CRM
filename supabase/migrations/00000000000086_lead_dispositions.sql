-- 00000000000086_lead_dispositions.sql

-- Create Categories Table
CREATE TABLE public.disposition_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Dispositions Table
CREATE TABLE public.dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.disposition_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    requires_follow_up BOOLEAN DEFAULT false,
    requires_note BOOLEAN DEFAULT false,
    next_action_required BOOLEAN DEFAULT false,
    target_status VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Sub-Dispositions Table
CREATE TABLE public.sub_dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disposition_id UUID REFERENCES public.dispositions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Next Actions Table
CREATE TABLE public.next_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disposition_id UUID REFERENCES public.dispositions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) DEFAULT 'Call', -- e.g., Call, WhatsApp, Email, Meeting
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alter Leads Table to store the latest disposition reference safely
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS latest_disposition_id UUID REFERENCES public.dispositions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latest_sub_disposition_id UUID REFERENCES public.sub_dispositions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMPTZ;

-- Create Disposition Transaction History
CREATE TABLE public.lead_disposition_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    disposition_id UUID REFERENCES public.dispositions(id) ON DELETE SET NULL,
    sub_disposition_id UUID REFERENCES public.sub_dispositions(id) ON DELETE SET NULL,
    next_action_id UUID REFERENCES public.next_actions(id) ON DELETE SET NULL,
    notes TEXT,
    follow_up_at TIMESTAMPTZ,
    previous_status VARCHAR(100),
    new_status VARCHAR(100),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add updated_at trigger logic
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_disposition_categories_updated_at
BEFORE UPDATE ON public.disposition_categories
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_dispositions_updated_at
BEFORE UPDATE ON public.dispositions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_sub_dispositions_updated_at
BEFORE UPDATE ON public.sub_dispositions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_next_actions_updated_at
BEFORE UPDATE ON public.next_actions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.disposition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_disposition_history ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read disposition configurations
CREATE POLICY "Allow read access to disposition_categories" ON public.disposition_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to dispositions" ON public.dispositions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to sub_dispositions" ON public.sub_dispositions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to next_actions" ON public.next_actions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read access to lead_disposition_history" ON public.lead_disposition_history FOR SELECT USING (auth.role() = 'authenticated');

-- Allow creation of history to authenticated users
CREATE POLICY "Allow insert access to lead_disposition_history" ON public.lead_disposition_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Admin write policies for configuration tables
CREATE POLICY "Allow admin write to disposition_categories" ON public.disposition_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin'))
);
CREATE POLICY "Allow admin write to dispositions" ON public.dispositions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin'))
);
CREATE POLICY "Allow admin write to sub_dispositions" ON public.sub_dispositions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin'))
);
CREATE POLICY "Allow admin write to next_actions" ON public.next_actions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin'))
);

-- Seed Data for Default B2B Funnel
DO $$
DECLARE
    cat_contacted UUID := gen_random_uuid();
    cat_not_connected UUID := gen_random_uuid();
    cat_interest UUID := gen_random_uuid();
    cat_qual UUID := gen_random_uuid();
    cat_objection UUID := gen_random_uuid();
    cat_not_int UUID := gen_random_uuid();
    cat_follow UUID := gen_random_uuid();
    cat_onboard UUID := gen_random_uuid();
    cat_conv UUID := gen_random_uuid();
    cat_lost UUID := gen_random_uuid();

    disp_connected UUID := gen_random_uuid();
    disp_cb_req UUID := gen_random_uuid();
    disp_no_resp UUID := gen_random_uuid();

    disp_high_int UUID := gen_random_uuid();
    disp_int UUID := gen_random_uuid();
    disp_wants_info UUID := gen_random_uuid();

    disp_qual_partner UUID := gen_random_uuid();
    disp_pot_partner UUID := gen_random_uuid();

    disp_payout_conc UUID := gen_random_uuid();
    disp_trust_conc UUID := gen_random_uuid();

    disp_not_int UUID := gen_random_uuid();

    disp_onboard_start UUID := gen_random_uuid();
    disp_doc_pend UUID := gen_random_uuid();
    
    disp_part_act UUID := gen_random_uuid();
    disp_lost UUID := gen_random_uuid();
    disp_wrong_num UUID := gen_random_uuid();

BEGIN
    -- Categories
    INSERT INTO public.disposition_categories (id, name, order_index) VALUES 
    (cat_not_connected, 'NOT CONNECTED', 5),
    (cat_contacted, 'CONTACTED', 10),
    (cat_interest, 'INTEREST / INTENT', 20),
    (cat_qual, 'QUALIFICATION', 30),
    (cat_objection, 'OBJECTION / BARRIER', 40),
    (cat_not_int, 'NOT INTERESTED', 50),
    (cat_follow, 'FOLLOW-UP REQUIRED', 60),
    (cat_onboard, 'PARTNER ONBOARDING', 70),
    (cat_conv, 'CONVERTED', 80),
    (cat_lost, 'LOST / CLOSED', 90);

    -- Not Connected Dispositions
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (gen_random_uuid(), cat_not_connected, 'Switched Off', true, false, 'Not Connected', 10),
    (gen_random_uuid(), cat_not_connected, 'Not Reachable', true, false, 'Not Connected', 20),
    (gen_random_uuid(), cat_not_connected, 'Number Busy', true, false, 'Not Connected', 30),
    (gen_random_uuid(), cat_not_connected, 'Ringing No Answer', true, false, 'Not Connected', 40),
    (gen_random_uuid(), cat_not_connected, 'Invalid Number', false, true, 'Rejected', 50);

    -- Contacted Dispositions (Connected)
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_connected, cat_contacted, 'Not Interested', false, true, 'Rejected', 10),
    (disp_cb_req, cat_contacted, 'Call Back Requested', true, false, 'Cold', 20),
    (disp_no_resp, cat_contacted, 'Counselled', true, true, 'Hot', 30),
    (gen_random_uuid(), cat_contacted, 'Follow Up', true, false, 'Warm', 40),
    (gen_random_uuid(), cat_contacted, 'Meeting Done', true, true, 'Qualified', 50),
    (gen_random_uuid(), cat_contacted, 'Registration Done', false, false, 'Application', 60),
    (gen_random_uuid(), cat_contacted, 'Document Collected', false, false, 'Docs Pending', 70),
    (gen_random_uuid(), cat_contacted, 'Follow-up Offer', true, false, 'Hot', 80),
    (gen_random_uuid(), cat_contacted, 'Follow-up Referral', true, false, 'Hot', 90),
    (gen_random_uuid(), cat_contacted, 'Semester Fee Paid', false, false, 'Admitted', 100),
    (gen_random_uuid(), cat_contacted, 'Loan Rejected', false, true, 'Rejected', 110);

    -- Interest Dispositions
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_high_int, cat_interest, 'Highly Interested', true, false, 'Hot', 10),
    (disp_int, cat_interest, 'Interested', true, false, 'Hot', 20),
    (disp_wants_info, cat_interest, 'Wants More Information', true, false, 'Warm', 30);

    -- Qualification Dispositions
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_qual_partner, cat_qual, 'Qualified Partner', true, false, 'Qualified', 10),
    (disp_pot_partner, cat_qual, 'Potential Partner', true, false, 'Qualified', 20);

    -- Objection Dispositions
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_payout_conc, cat_objection, 'Payout Concern', true, true, 'Warm', 10),
    (disp_trust_conc, cat_objection, 'Trust Concern', true, true, 'Warm', 20);

    -- Not Interested
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_not_int, cat_not_int, 'Not Interested', false, true, 'Rejected', 10);

    -- Onboarding
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_onboard_start, cat_onboard, 'Onboarding Started', true, false, 'Application', 10),
    (disp_doc_pend, cat_onboard, 'Documents Pending', true, false, 'Docs Pending', 20);

    -- Converted
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_part_act, cat_conv, 'Partner Activated', false, false, 'Admitted', 10);

    -- Lost
    INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES 
    (disp_lost, cat_lost, 'Lost', false, true, 'Rejected', 10),
    (disp_wrong_num, cat_lost, 'Wrong Number', false, false, 'Rejected', 20);

    -- Sub-dispositions
    INSERT INTO public.sub_dispositions (disposition_id, name, order_index) VALUES
    (disp_payout_conc, 'Payout too low', 10),
    (disp_payout_conc, 'Wants higher payout', 20),
    (disp_payout_conc, 'Comparing competitor payout', 30),
    (disp_not_int, 'No Current Students', 10),
    (disp_not_int, 'Not Doing Online Education', 20),
    (disp_not_int, 'Already Partnered', 30),
    (disp_not_int, 'Other', 40),
    (disp_lost, 'Competitor Selected', 10),
    (disp_lost, 'Business Closed', 20),
    (disp_lost, 'Other', 30);

    -- Next Actions
    INSERT INTO public.next_actions (disposition_id, name, action_type, order_index) VALUES
    (disp_cb_req, 'Call Back', 'Call', 10),
    (disp_no_resp, 'Call Back', 'Call', 10),
    (disp_no_resp, 'WhatsApp Follow-up', 'WhatsApp', 20),
    (disp_wants_info, 'Send Payout Information', 'Email', 10),
    (disp_wants_info, 'Send University List', 'Email', 20),
    (disp_wants_info, 'Schedule Demo', 'Meeting', 30),
    (disp_qual_partner, 'Start Onboarding', 'Call', 10),
    (disp_onboard_start, 'Collect Documents', 'Call', 10);

END $$;
