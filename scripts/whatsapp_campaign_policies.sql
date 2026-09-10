-- WhatsApp Campaigns Policy & Realtime Configuration
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'whatsapp_campaigns' AND policyname = 'Authenticated users can view campaigns'
    ) THEN
        CREATE POLICY "Authenticated users can view campaigns"
            ON public.whatsapp_campaigns FOR SELECT
            USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'whatsapp_campaigns' AND policyname = 'Managers can manage campaigns'
    ) THEN
        CREATE POLICY "Managers can manage campaigns"
            ON public.whatsapp_campaigns FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.users u
                    JOIN public.roles r ON u.role_id = r.id
                    WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin', 'Manager')
                )
            );
    END IF;
END $$;

ALTER TABLE public.whatsapp_campaigns REPLICA IDENTITY FULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_campaigns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_campaigns;
    END IF;
END $$;
