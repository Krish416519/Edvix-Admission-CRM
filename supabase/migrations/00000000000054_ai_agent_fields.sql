-- 00000000000054_ai_agent_fields.sql
-- Edvix AI CRM - AI Agent Architecture Fields

-- Extend Leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS conversion_probability NUMERIC(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS temperature VARCHAR(50) DEFAULT 'Cold',
ADD COLUMN IF NOT EXISTS response_speed_hours NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS drop_off_risk VARCHAR(50) DEFAULT 'Low',
ADD COLUMN IF NOT EXISTS payment_probability NUMERIC(5,2) DEFAULT 0.0;

-- Extend Admissions
ALTER TABLE public.admissions
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS at_risk BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS risk_reason TEXT,
ADD COLUMN IF NOT EXISTS predicted_completion_days INTEGER;

-- Extend Payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS late_probability NUMERIC(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS collection_urgency VARCHAR(50) DEFAULT 'Low';

-- Add a daily tracking table for Founders Dashboard (Time Series Data)
CREATE TABLE IF NOT EXISTS public.ai_executive_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    revenue_forecast NUMERIC(12,2) DEFAULT 0,
    expected_admissions INTEGER DEFAULT 0,
    lead_quality_score INTEGER DEFAULT 0,
    risk_alerts JSONB DEFAULT '[]'::jsonb,
    growth_opportunities JSONB DEFAULT '[]'::jsonb,
    suggested_decisions JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_executive_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can view briefings" ON public.ai_executive_briefings
    FOR SELECT TO authenticated
    USING (
        public.user_role() IN ('Super Admin', 'Admin')
    );

CREATE POLICY "Service roles can manage briefings" ON public.ai_executive_briefings
    FOR ALL TO service_role USING (true);
