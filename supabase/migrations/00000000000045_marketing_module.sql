-- Marketing Campaigns Table
CREATE TABLE public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Lead Generation', 'Brand Awareness', 'Retargeting', 'Email Nurture', 'WhatsApp Blast')),
    platform TEXT NOT NULL CHECK (platform IN ('Google Ads', 'Meta Ads', 'Instagram', 'LinkedIn', 'YouTube', 'Website', 'Organic SEO', 'Referral', 'Partner', 'Offline')),
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
    spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Paused', 'Draft', 'Completed', 'Archived')) DEFAULT 'Draft',
    owner_id UUID REFERENCES public.users(id),
    goal TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    metrics_impressions INTEGER DEFAULT 0,
    metrics_clicks INTEGER DEFAULT 0,
    metrics_leads_generated INTEGER DEFAULT 0,
    metrics_admissions INTEGER DEFAULT 0,
    metrics_revenue NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketing Journeys Table
CREATE TABLE public.marketing_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Active', 'Draft', 'Paused')) DEFAULT 'Draft',
    trigger_event TEXT NOT NULL,
    enrolled_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journey Steps Table
CREATE TABLE public.marketing_journey_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Email', 'WhatsApp', 'Delay', 'Assign', 'Condition')),
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_platform ON public.marketing_campaigns(platform);
CREATE INDEX idx_marketing_journeys_status ON public.marketing_journeys(status);
CREATE INDEX idx_marketing_journey_steps_journey_id ON public.marketing_journey_steps(journey_id);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_journey_steps ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at
    BEFORE UPDATE ON public.marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_journeys_updated_at
    BEFORE UPDATE ON public.marketing_journeys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
-- Only Super Admins and Admins and Marketing roles can manage marketing data
-- Fallback policy based on role check
CREATE POLICY "Marketing full access" ON public.marketing_campaigns
    FOR ALL USING (
        public.user_role() IN ('Super Admin', 'Admin', 'Marketing')
    );

CREATE POLICY "Marketing full access" ON public.marketing_journeys
    FOR ALL USING (
        public.user_role() IN ('Super Admin', 'Admin', 'Marketing')
    );

CREATE POLICY "Marketing full access" ON public.marketing_journey_steps
    FOR ALL USING (
        public.user_role() IN ('Super Admin', 'Admin', 'Marketing')
    );

-- Read access for Managers and Team Leaders
CREATE POLICY "Managers can read marketing" ON public.marketing_campaigns
    FOR SELECT USING (
        public.user_role() IN ('Manager', 'Team Leader')
    );

CREATE POLICY "Managers can read marketing" ON public.marketing_journeys
    FOR SELECT USING (
        public.user_role() IN ('Manager', 'Team Leader')
    );

CREATE POLICY "Managers can read marketing" ON public.marketing_journey_steps
    FOR SELECT USING (
        public.user_role() IN ('Manager', 'Team Leader')
    );