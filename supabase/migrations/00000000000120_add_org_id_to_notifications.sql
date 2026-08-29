-- 00000000000120_add_org_id_to_notifications.sql

-- Safely add organization_id to notifications if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'organization_id') THEN
        ALTER TABLE public.notifications ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(organization_id);
    END IF;
END $$;
