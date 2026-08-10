-- 00000000000077_api_foundation.sql

-- 1. Upgrading api_keys table
DO $$ 
BEGIN
    -- Drop deprecated token column if it still exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'token') THEN
        ALTER TABLE public.api_keys DROP COLUMN token;
    END IF;

    -- Add new columns safely
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'environment') THEN
        ALTER TABLE public.api_keys ADD COLUMN environment TEXT NOT NULL CHECK (environment IN ('Test', 'Production')) DEFAULT 'Production';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'rate_limit') THEN
        ALTER TABLE public.api_keys ADD COLUMN rate_limit INTEGER NOT NULL DEFAULT 100; -- Requests per minute
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'expires_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'created_by') THEN
        ALTER TABLE public.api_keys ADD COLUMN created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'revoked_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN revoked_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Upgrading api_logs table
DO $$ 
BEGIN
    -- Add request_id, organization_id, api_key_id, user_agent, error_code safely
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'request_id') THEN
        ALTER TABLE public.api_logs ADD COLUMN request_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'organization_id') THEN
        ALTER TABLE public.api_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'api_key_id') THEN
        ALTER TABLE public.api_logs ADD COLUMN api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'user_agent') THEN
        ALTER TABLE public.api_logs ADD COLUMN user_agent TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'error_code') THEN
        ALTER TABLE public.api_logs ADD COLUMN error_code TEXT;
    END IF;
END $$;
