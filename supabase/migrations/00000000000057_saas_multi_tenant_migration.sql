-- 00000000000057_saas_multi_tenant_migration.sql
-- Transitions the CRM into a Multi-Tenant SaaS platform.

--------------------------------------------------
-- 1. NEW SAAS TABLES
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Inactive')),
    plan VARCHAR(50) NOT NULL DEFAULT 'Trial',
    billing_customer_id VARCHAR(255),
    subscription_id VARCHAR(255),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    max_users INTEGER DEFAULT 10,
    max_leads INTEGER DEFAULT 1000,
    max_storage INTEGER DEFAULT 5000,
    max_ai_usage INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    enable_ai BOOLEAN DEFAULT TRUE,
    enable_whatsapp BOOLEAN DEFAULT FALSE,
    enable_calling BOOLEAN DEFAULT FALSE,
    enable_partner_portal BOOLEAN DEFAULT FALSE,
    enable_university_portal BOOLEAN DEFAULT FALSE,
    api_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID, -- Will point to organization_roles later
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Invited', 'Deactivated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    record_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Super Admin flag on users
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN is_platform_super_admin BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

--------------------------------------------------
-- 2. DYNAMIC MIGRATION OF EXISTING TABLES
--------------------------------------------------

DO $$ 
DECLARE 
    tenant_tables text[] := ARRAY[
        'roles', 'permissions', 'role_permissions',
        'universities', 'courses', 'leads', 'lead_activities', 'tasks', 'notes', 'admissions', 'documents', 
        'payments', 'notifications', 'automation_logs', 'ai_logs', 'task_comments', 'task_reminders', 
        'task_history', 'admission_stage_history', 'admission_notes', 'admission_tags', 'document_versions', 
        'document_verification', 'document_comments', 'invoices', 'invoice_items', 'payment_receipts', 
        'payment_installments', 'ledger_entries', 'commission_rules', 'commissions', 'university_payouts', 
        'refunds', 'financial_adjustments', 'notification_channels', 'notification_templates', 
        'notification_preferences', 'notification_delivery_logs', 'ai_conversations', 'ai_messages', 
        'ai_audit_logs', 'whatsapp_conversations', 'whatsapp_messages', 'whatsapp_templates', 
        'whatsapp_webhooks', 'email_campaigns', 'email_messages', 'email_templates', 'marketing_campaigns', 
        'marketing_leads', 'integrations', 'partner_agreements', 'partner_commissions', 'partner_leads', 
        'university_agreements', 'university_contacts', 'telephony_calls', 'telephony_logs', 'telephony_agents', 
        'telephony_recordings', 'ai_recommendations', 'admission_os_workflows', 'admission_os_runs'
    ];
    t text;
    edvix_org_id uuid;
BEGIN
    -- 1. Create Edvix Organization if not exists
    SELECT id INTO edvix_org_id FROM public.organizations WHERE slug = 'edvix';
    IF edvix_org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug, status, plan)
        VALUES ('Edvix', 'edvix', 'Active', 'Enterprise')
        RETURNING id INTO edvix_org_id;
        
        -- Create default settings
        INSERT INTO public.organization_settings (organization_id, enable_ai, enable_whatsapp, enable_calling, enable_partner_portal, enable_university_portal, api_access)
        VALUES (edvix_org_id, true, true, true, true, true, true);
    END IF;

    -- 2. Migrate existing users into organization_users
    INSERT INTO public.organization_users (organization_id, user_id, role_id, status)
    SELECT edvix_org_id, id, role_id, 'Active' FROM public.users
    ON CONFLICT DO NOTHING;
    
    -- Make the first user a platform super admin just in case
    UPDATE public.users SET is_platform_super_admin = TRUE WHERE id IN (
        SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1
    );

    -- 3. Loop through tables and add organization_id
    FOREACH t IN ARRAY tenant_tables
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            
            -- Add column if it doesn't exist
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id UUID', t);
            END IF;

            -- Update existing records to point to Edvix
            RAISE NOTICE 'Updating table: %', t;
            EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', t, edvix_org_id);

            -- Add foreign key constraint if not exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = t AND constraint_name = format('fk_%s_org', t)) THEN
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT fk_%I_org FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE', t, t);
            END IF;

            -- Make it NOT NULL
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);

            -- Create index
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_org_id ON public.%I(organization_id)', t, t);
        END IF;
    END LOOP;
END $$;

--------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR MULTI-TENANCY
--------------------------------------------------

-- Helper function to check if user belongs to an org
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Platform Super Admins bypass
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_platform_super_admin = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- Check membership
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users 
        WHERE user_id = auth.uid() 
        AND organization_id = org_id 
        AND status = 'Active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable all existing RLS on these tables (if they exist) so we can replace them cleanly
-- We will enable RLS and add a strict policy using the function above.
DO $$ 
DECLARE 
    tenant_tables text[] := ARRAY[
        'universities', 'courses', 'leads', 'lead_activities', 'tasks', 'notes', 'admissions', 'documents', 
        'payments', 'notifications', 'automation_logs', 'ai_logs', 'invoices', 'invoice_items', 'ledger_entries',
        'telephony_calls', 'telephony_logs', 'ai_conversations', 'ai_messages'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tenant_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            -- Try dropping policy if exists (ignore error if it doesn't)
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I', t);
            EXCEPTION WHEN others THEN null; END;

            -- Create the new tenant isolation policy
            EXECUTE format('
                CREATE POLICY tenant_isolation_policy ON public.%I
                FOR ALL
                USING (public.is_member_of(organization_id))
                WITH CHECK (public.is_member_of(organization_id))
            ', t);
        END IF;
    END LOOP;
END $$;

-- Policies for organization_users itself
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_users_isolation ON public.organization_users;
CREATE POLICY org_users_isolation ON public.organization_users
    FOR ALL
    USING (public.is_member_of(organization_id))
    WITH CHECK (public.is_member_of(organization_id));

-- Policies for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON public.organizations;
CREATE POLICY org_isolation ON public.organizations
    FOR ALL
    USING (public.is_member_of(id))
    WITH CHECK (public.is_member_of(id));
