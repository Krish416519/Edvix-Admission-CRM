-- 00000000000112_add_organization_id_to_tasks.sql
-- Add missing organization_id to tasks table if it was dropped or not added

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'organization_id') THEN
        ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        -- Set a default organization ID if organizations exist
        UPDATE public.tasks SET organization_id = (SELECT id FROM public.organizations LIMIT 1) WHERE organization_id IS NULL;
        
        -- Optional: make it NOT NULL later if needed, but for now just adding it resolves the trigger error.
        -- ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL;
    END IF;
END $$;
