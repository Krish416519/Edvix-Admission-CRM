-- 00000000000141_enterprise_rbac_domains.sql
-- Phase 2: Domain Model & Phase 3: Role Model

-- 1. Create domains table
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed core domains
INSERT INTO public.domains (name, slug, description) VALUES
('Admission', 'admission', 'Admission and Counseling Operations'),
('HR', 'hr', 'Human Resources Operations'),
('Finance', 'finance', 'Financial Operations')
ON CONFLICT (slug) DO NOTHING;

-- 2. Add domain_id to roles
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL;

-- 3. Add domain_id to users and migrate data
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL;

-- Migrate existing text department to domain_id
DO $$
DECLARE
    v_admission_id UUID;
    v_hr_id UUID;
    v_finance_id UUID;
BEGIN
    SELECT id INTO v_admission_id FROM public.domains WHERE slug = 'admission';
    SELECT id INTO v_hr_id FROM public.domains WHERE slug = 'hr';
    SELECT id INTO v_finance_id FROM public.domains WHERE slug = 'finance';

    UPDATE public.users SET domain_id = v_admission_id WHERE department ILIKE '%admission%' OR department ILIKE '%counseling%' OR department ILIKE '%sales%';
    UPDATE public.users SET domain_id = v_hr_id WHERE department ILIKE '%hr%' OR department ILIKE '%human resources%';
    UPDATE public.users SET domain_id = v_finance_id WHERE department ILIKE '%finance%' OR department ILIKE '%accounts%';
    
    -- Default unmapped users to Admission if they are counselors/managers (Fallback)
    UPDATE public.users SET domain_id = v_admission_id WHERE domain_id IS NULL AND department IS NOT NULL;
END $$;

-- 4. Seed new Enterprise Roles explicitly associated with Domains
DO $$
DECLARE
    v_admission_id UUID;
    v_hr_id UUID;
    v_finance_id UUID;
    v_org_id UUID;
BEGIN
    SELECT id INTO v_admission_id FROM public.domains WHERE slug = 'admission';
    SELECT id INTO v_hr_id FROM public.domains WHERE slug = 'hr';
    SELECT id INTO v_finance_id FROM public.domains WHERE slug = 'finance';
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;

    -- Note: Super Admin doesn't belong to a specific domain (Global)
    
    -- Admission Roles
    INSERT INTO public.roles (name, domain_id, organization_id) VALUES
    ('Admission Admin', v_admission_id, v_org_id),
    ('Admission Manager', v_admission_id, v_org_id),
    ('Admission Executive', v_admission_id, v_org_id)
    ON CONFLICT (name) DO NOTHING;

    -- HR Roles
    INSERT INTO public.roles (name, domain_id, organization_id) VALUES
    ('HR Admin', v_hr_id, v_org_id),
    ('HR Manager', v_hr_id, v_org_id),
    ('HR Executive', v_hr_id, v_org_id)
    ON CONFLICT (name) DO NOTHING;

    -- Finance Roles
    INSERT INTO public.roles (name, domain_id, organization_id) VALUES
    ('Finance Admin', v_finance_id, v_org_id),
    ('Finance Manager', v_finance_id, v_org_id),
    ('Finance Executive', v_finance_id, v_org_id)
    ON CONFLICT (name) DO NOTHING;
END $$;
