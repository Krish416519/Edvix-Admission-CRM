-- 00000000000059_billing_and_subscriptions.sql
-- SaaS Billing and Subscription Foundation

--------------------------------------------------
-- 1. BILLING SCHEMAS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    annual_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Feature Limits
    max_users INTEGER NOT NULL DEFAULT 1,
    max_leads INTEGER NOT NULL DEFAULT 100,
    max_storage_mb INTEGER NOT NULL DEFAULT 100,
    max_ai_usage INTEGER NOT NULL DEFAULT 0,
    max_whatsapp_usage INTEGER NOT NULL DEFAULT 0,
    max_email_usage INTEGER NOT NULL DEFAULT 0,
    max_api_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Feature Flags
    features JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed some default plans
INSERT INTO public.plans (name, description, monthly_price, annual_price, max_users, max_leads, max_storage_mb, max_ai_usage, features)
VALUES 
('Trial', '14-day free trial', 0, 0, 5, 500, 500, 100, '{"crm": true}'::jsonb),
('Starter', 'For small teams', 49, 490, 5, 5000, 5000, 500, '{"crm": true, "email": true}'::jsonb),
('Professional', 'For growing businesses', 99, 990, 20, 50000, 20000, 2000, '{"crm": true, "email": true, "whatsapp": true, "reports": true}'::jsonb),
('Enterprise', 'Unlimited Everything', 299, 2990, 9999, 9999999, 9999999, 999999, '{"crm": true, "email": true, "whatsapp": true, "reports": true, "api_access": true, "partner_portal": true}'::jsonb);

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'suspended')),
    billing_provider VARCHAR(50), -- e.g., 'stripe', 'razorpay'
    external_customer_id VARCHAR(255),
    external_subscription_id VARCHAR(255),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
    external_invoice_id VARCHAR(255),
    amount_due NUMERIC(10, 2) NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    billing_reason VARCHAR(100), -- 'subscription_create', 'subscription_cycle', 'upgrade'
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    external_payment_intent_id VARCHAR(255),
    payment_method_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_webhooks_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL UNIQUE, -- Prevents duplicate webhook processing
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tenant_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- e.g., 'users', 'leads', 'ai_requests'
    current_value INTEGER NOT NULL DEFAULT 0,
    billing_period_start TIMESTAMPTZ NOT NULL,
    billing_period_end TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, metric_name, billing_period_start)
);

--------------------------------------------------
-- 2. MIGRATE EXISTING ORGANIZATIONS
--------------------------------------------------

DO $$ 
DECLARE 
    org RECORD;
    enterprise_plan_id UUID;
BEGIN
    SELECT id INTO enterprise_plan_id FROM public.plans WHERE name = 'Enterprise' LIMIT 1;
    
    FOR org IN SELECT * FROM public.organizations LOOP
        INSERT INTO public.organization_subscriptions (organization_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
        VALUES (
            org.id, 
            enterprise_plan_id, 
            'active', 
            NOW(), 
            NOW() + INTERVAL '14 days', 
            NOW(), 
            NOW() + INTERVAL '1 year'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Now drop old columns safely
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS plan,
DROP COLUMN IF EXISTS subscription_id,
DROP COLUMN IF EXISTS billing_customer_id,
DROP COLUMN IF EXISTS trial_start,
DROP COLUMN IF EXISTS trial_end,
DROP COLUMN IF EXISTS max_users,
DROP COLUMN IF EXISTS max_leads,
DROP COLUMN IF EXISTS max_storage,
DROP COLUMN IF EXISTS max_ai_usage;

--------------------------------------------------
-- 3. RLS POLICIES FOR BILLING
--------------------------------------------------

-- Ensure we can call our is_member_of function from the previous migration.
-- Plans are universally readable
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_all_plans ON public.plans FOR SELECT USING (true);

-- Organization Subscriptions
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_sub_policy ON public.organization_subscriptions
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Invoices
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_invoice_policy ON public.billing_invoices
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Payments
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_payment_policy ON public.billing_payments
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Usage
ALTER TABLE public.tenant_usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_usage_policy ON public.tenant_usage_metrics
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Webhooks audit is strictly private to service roles / super admins
ALTER TABLE public.billing_webhooks_audit ENABLE ROW LEVEL SECURITY;
-- No policies -> completely locked down except for bypass_rls (postgres/service_role)

--------------------------------------------------
-- 4. USAGE TRACKING TRIGGERS (LEADS)
--------------------------------------------------

-- Note: We can implement similar triggers for Users, AI requests, etc.
-- But for Leads, it's critical.

CREATE OR REPLACE FUNCTION public.check_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_plan RECORD;
    current_usage INTEGER;
BEGIN
    -- 1. Get current plan for the organization
    SELECT p.* INTO current_plan
    FROM public.organization_subscriptions os
    JOIN public.plans p ON os.plan_id = p.id
    WHERE os.organization_id = NEW.organization_id
    AND os.status IN ('active', 'trialing');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active subscription found for this organization.';
    END IF;

    -- 2. Check Leads limit
    IF TG_TABLE_NAME = 'leads' THEN
        -- Optimistic check, a more rigorous approach would query the table or use tenant_usage_metrics
        SELECT COUNT(*) INTO current_usage FROM public.leads WHERE organization_id = NEW.organization_id;
        
        IF current_usage >= current_plan.max_leads THEN
            RAISE EXCEPTION 'Plan limit exceeded: Maximum leads reached (%). Please upgrade your subscription.', current_plan.max_leads;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach limits to Leads
DROP TRIGGER IF EXISTS trg_check_lead_limits ON public.leads;
CREATE TRIGGER trg_check_lead_limits
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.check_plan_limits();
