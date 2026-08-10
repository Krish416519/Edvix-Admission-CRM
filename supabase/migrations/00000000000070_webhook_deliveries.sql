-- 00000000000070_webhook_deliveries.sql
-- Tracking logs for outbound webhooks

CREATE TABLE public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    url TEXT NOT NULL,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    status_code INTEGER,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Success', 'Failed')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's webhook deliveries"
    ON public.webhook_deliveries
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Allow service role to insert/update (for Postgres triggers and Edge Functions)
-- (Service role bypasses RLS anyway, but good practice)
