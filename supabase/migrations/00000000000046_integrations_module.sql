-- API Keys Table
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    token TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('Active', 'Revoked')) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhooks Table
CREATE TABLE public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('Active', 'Disabled')) DEFAULT 'Active',
    secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Logs Table
CREATE TABLE public.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    ip_address TEXT,
    source TEXT,
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import Jobs Table
CREATE TABLE public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')) DEFAULT 'Pending',
    total_rows INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead Sources Config Table
CREATE TABLE public.lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    api_key_id UUID REFERENCES public.api_keys(id),
    webhook_id UUID REFERENCES public.webhooks(id),
    status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_status ON public.api_keys(status);
CREATE INDEX idx_webhooks_status ON public.webhooks(status);
CREATE INDEX idx_api_logs_timestamp ON public.api_logs(timestamp);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_lead_sources_status ON public.lead_sources(status);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_jobs_updated_at
    BEFORE UPDATE ON public.import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at
    BEFORE UPDATE ON public.lead_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Admins and Super Admins only)
CREATE POLICY "Integrations full access" ON public.api_keys
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));
CREATE POLICY "Integrations full access" ON public.webhooks
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));
CREATE POLICY "Integrations full access" ON public.api_logs
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));
CREATE POLICY "Integrations full access" ON public.import_jobs
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));
CREATE POLICY "Integrations full access" ON public.lead_sources
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));