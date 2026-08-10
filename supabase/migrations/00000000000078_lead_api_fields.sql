-- 00000000000078_lead_api_fields.sql

DO $$ 
BEGIN
    -- 1. Add Marketing & API tracking fields to leads table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'external_id') THEN
        ALTER TABLE public.leads ADD COLUMN external_id VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'medium') THEN
        ALTER TABLE public.leads ADD COLUMN medium VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'utm_source') THEN
        ALTER TABLE public.leads ADD COLUMN utm_source VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'utm_medium') THEN
        ALTER TABLE public.leads ADD COLUMN utm_medium VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'utm_campaign') THEN
        ALTER TABLE public.leads ADD COLUMN utm_campaign VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'utm_content') THEN
        ALTER TABLE public.leads ADD COLUMN utm_content VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'utm_term') THEN
        ALTER TABLE public.leads ADD COLUMN utm_term VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'landing_page') THEN
        ALTER TABLE public.leads ADD COLUMN landing_page TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'referrer') THEN
        ALTER TABLE public.leads ADD COLUMN referrer TEXT;
    END IF;
    
    -- We already have lead_source, campaign, and course in leads table.

END $$;

-- 2. Create the API Idempotency Table
CREATE TABLE IF NOT EXISTS public.api_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    idempotency_key TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_body JSONB NOT NULL,
    response_status INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- A specific key should be unique per organization to prevent replay attacks
    CONSTRAINT unique_org_idempotency_key UNIQUE (organization_id, idempotency_key)
);

-- Index for quick lookup during API requests
CREATE INDEX IF NOT EXISTS idx_api_idempotency_lookup ON public.api_idempotency(organization_id, idempotency_key);

-- Security Configuration for API Idempotency
ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform Admin Full Access on api_idempotency" 
ON public.api_idempotency 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_platform_super_admin = TRUE)
);

-- The Edge Gateway (Service Role) bypasses RLS naturally.

-- 3. Unique Index for external_id to prevent duplicates natively when doing concurrent inserts
-- We only want uniqueness if external_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS unique_lead_external_id_per_org 
ON public.leads(organization_id, external_id) 
WHERE external_id IS NOT NULL;
