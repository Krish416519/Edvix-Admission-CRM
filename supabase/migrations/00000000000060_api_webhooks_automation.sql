-- 00000000000060_api_webhooks_automation.sql
-- Public API, Webhooks, and Automation Engine

CREATE EXTENSION IF NOT EXISTS pgcrypto;

--------------------------------------------------
-- 1. PUBLIC API (API KEYS)
--------------------------------------------------

-- The api_keys table already exists from migration 46, we need to alter it to fit SaaS
DO $$ 
BEGIN
    -- Add multi-tenant column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'organization_id') THEN
        ALTER TABLE public.api_keys ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        -- Default existing keys to Edvix org if any
        UPDATE public.api_keys SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'edvix' LIMIT 1) WHERE organization_id IS NULL;
        
        ALTER TABLE public.api_keys ALTER COLUMN organization_id SET NOT NULL;
    END IF;

    -- Add key_hash and scopes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_hash') THEN
        ALTER TABLE public.api_keys ADD COLUMN key_hash TEXT UNIQUE;
        -- Generate dummy hash for old keys to avoid null constraints initially
        UPDATE public.api_keys SET key_hash = gen_random_uuid()::text WHERE key_hash IS NULL;
        ALTER TABLE public.api_keys ALTER COLUMN key_hash SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'scopes') THEN
        ALTER TABLE public.api_keys ADD COLUMN scopes JSONB DEFAULT '["*"]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'last_used_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
END $$;

-- Drop existing global policy if it exists
DO $$ BEGIN
    DROP POLICY IF EXISTS "Integrations full access" ON public.api_keys;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "tenant_api_keys_policy" ON public.api_keys;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_api_keys_policy ON public.api_keys
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Function to extract API key from headers and return the associated organization_id
CREATE OR REPLACE FUNCTION public.get_api_org_id()
RETURNS UUID AS $$
DECLARE
    headers JSON;
    api_key TEXT;
    org_id UUID;
BEGIN
    -- Only allow this to run if the role is anon or authenticated (PostgREST)
    IF current_setting('role', true) IN ('anon', 'authenticated') THEN
        BEGIN
            headers := current_setting('request.headers', true)::json;
            -- Check for X-Api-Key
            api_key := headers->>'x-api-key';
            
            -- If not found, check for Bearer token
            IF api_key IS NULL THEN
                api_key := replace(headers->>'authorization', 'Bearer ', '');
            END IF;

            IF api_key IS NOT NULL AND api_key != '' THEN
                -- Find the organization_id mapped to this api key
                SELECT organization_id INTO org_id
                FROM public.api_keys
                WHERE key_hash = encode(extensions.digest(api_key::text, 'sha256'::text), 'hex')
                AND status = 'Active';

                IF org_id IS NOT NULL THEN
                    -- We can't trivially UPDATE in a potentially readonly function depending on postgres config,
                    -- so we skip updating last_used_at here for simplicity and safety.
                    RETURN org_id;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the is_member_of function to implicitly trust valid API Keys!
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    api_org_id UUID;
BEGIN
    -- 1. Check if a valid API key is being used
    api_org_id := public.get_api_org_id();
    IF api_org_id IS NOT NULL THEN
        RETURN api_org_id = org_id;
    END IF;

    -- 2. Check if user is Platform Super Admin
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_platform_super_admin = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- 3. Check regular membership
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users 
        WHERE user_id = auth.uid() 
        AND organization_id = org_id 
        AND status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


--------------------------------------------------
-- 2. WEBHOOKS LAYER
--------------------------------------------------

-- The webhooks table already exists from migration 46!
-- We need to alter it as well
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'organization_id') THEN
        ALTER TABLE public.webhooks ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        UPDATE public.webhooks SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'edvix' LIMIT 1) WHERE organization_id IS NULL;
        ALTER TABLE public.webhooks ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Integrations full access" ON public.webhooks;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_webhooks_policy ON public.webhooks
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- We create a specific table for webhook INCOMING payloads
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL, -- e.g., 'meta_leads', 'google_ads', 'razorpay'
    event_type VARCHAR(255) NOT NULL,
    external_id VARCHAR(255) NOT NULL UNIQUE, -- Idempotency key
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_webhook_events_policy ON public.webhook_events
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

--------------------------------------------------
-- 3. AUTOMATION ENGINE
--------------------------------------------------

-- The automation_workflows table already exists from migration 17
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automation_workflows' AND column_name = 'organization_id') THEN
        ALTER TABLE public.automation_workflows ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        UPDATE public.automation_workflows SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'edvix' LIMIT 1) WHERE organization_id IS NULL;
        ALTER TABLE public.automation_workflows ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "tenant_automation_workflows_policy" ON public.automation_workflows;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_automation_workflows_policy ON public.automation_workflows
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));
