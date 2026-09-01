-- 20260902000000_dynamic_lead_fields.sql

--------------------------------------------------
-- 1. Add custom_fields to leads
--------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'custom_fields') THEN
        ALTER TABLE public.leads ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

--------------------------------------------------
-- 2. Create lead_form_fields configuration table
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_form_fields (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, select, date, boolean
    is_required BOOLEAN DEFAULT false,
    options JSONB, -- For select dropdowns e.g. ["Option 1", "Option 2"]
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, field_name)
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER trg_update_lead_form_fields_modtime
BEFORE UPDATE ON public.lead_form_fields
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for auto-setting organization_id
CREATE OR REPLACE TRIGGER trg_set_org_id_lead_form_fields
BEFORE INSERT ON public.lead_form_fields
FOR EACH ROW EXECUTE FUNCTION public.set_default_organization_id();

--------------------------------------------------
-- 3. Row Level Security for lead_form_fields
--------------------------------------------------
ALTER TABLE public.lead_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read fields for their organization" 
ON public.lead_form_fields 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can insert fields" 
ON public.lead_form_fields 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.users WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Super Admin', 'Admin')))
);

CREATE POLICY "Admins can update fields" 
ON public.lead_form_fields 
FOR UPDATE 
USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Super Admin', 'Admin')))
);

CREATE POLICY "Admins can delete fields" 
ON public.lead_form_fields 
FOR DELETE 
USING (
  auth.uid() IN (SELECT id FROM public.users WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Super Admin', 'Admin')))
);

--------------------------------------------------
-- 4. Seed initial fields based on old non-UUID text fields
--------------------------------------------------
-- Since we are replacing the string fields 'course' and 'university' with dynamic fields:
DO $$ 
DECLARE
    default_org UUID;
BEGIN
    SELECT id INTO default_org FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    
    IF default_org IS NOT NULL THEN
        -- Insert a default custom field for Target Program if it doesn't exist
        INSERT INTO public.lead_form_fields (organization_id, field_name, field_label, field_type, is_required, display_order)
        VALUES (default_org, 'target_program', 'Target Program', 'text', false, 1)
        ON CONFLICT (organization_id, field_name) DO NOTHING;

        -- Insert a default custom field for Target University if it doesn't exist
        INSERT INTO public.lead_form_fields (organization_id, field_name, field_label, field_type, is_required, display_order)
        VALUES (default_org, 'target_university', 'Target University', 'text', false, 2)
        ON CONFLICT (organization_id, field_name) DO NOTHING;
    END IF;
END $$;
