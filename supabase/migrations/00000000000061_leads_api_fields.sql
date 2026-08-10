-- 00000000000061_leads_api_fields.sql
-- Adding campaign and raw course fields for API/Webhook ingestion

DO $$ 
BEGIN
    -- Add campaign tracking field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign') THEN
        ALTER TABLE public.leads ADD COLUMN campaign VARCHAR(255);
    END IF;

    -- Add raw course string (for external lead forms before they are mapped to an internal course_id)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'course') THEN
        ALTER TABLE public.leads ADD COLUMN course VARCHAR(255);
    END IF;
END $$;
