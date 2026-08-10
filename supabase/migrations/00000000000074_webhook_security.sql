-- 00000000000074_webhook_security.sql
-- Implement Webhook Security (HTTPS Enforcment & Secret Rotation)

-- 1. HTTPS Enforcement: Ensure all webhook URLs are strictly HTTPS
-- This protects payloads from interception.
-- Note: We only add the constraint for new or updated rows, existing ones need to be updated.
ALTER TABLE public.webhooks
ADD CONSTRAINT enforce_https_webhooks CHECK (url LIKE 'https://%');

-- 2. Secret Rotation
-- We use pgcrypto to generate a secure random hex string (64 chars)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.rotate_webhook_secret(p_webhook_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_secret TEXT;
    v_org_id UUID;
BEGIN
    -- Check permissions: user must belong to the org that owns the webhook
    SELECT organization_id INTO v_org_id FROM public.webhooks WHERE id = p_webhook_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Webhook not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.organization_users 
        WHERE organization_id = v_org_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access Denied: Not an organization member';
    END IF;

    -- Generate a strong 64-character hex secret (32 bytes of secure random)
    v_new_secret := encode(gen_random_bytes(32), 'hex');

    -- Update the secret in the database
    UPDATE public.webhooks 
    SET secret = v_new_secret, updated_at = NOW()
    WHERE id = p_webhook_id;

    RETURN v_new_secret;
END;
$$;
