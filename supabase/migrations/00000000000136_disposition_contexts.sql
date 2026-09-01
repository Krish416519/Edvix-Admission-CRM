-- 00000000000136_disposition_contexts.sql

-- Add crm_context to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS crm_context VARCHAR(50) DEFAULT 'academic';

-- Add crm_context to disposition_categories
ALTER TABLE public.disposition_categories 
ADD COLUMN IF NOT EXISTS crm_context VARCHAR(50) DEFAULT 'academic';

-- Add crm_context to dispositions
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS crm_context VARCHAR(50) DEFAULT 'academic';

-- Update explicitly B2B categories
UPDATE public.disposition_categories
SET crm_context = 'b2b'
WHERE name IN ('QUALIFICATION', 'PARTNER ONBOARDING', 'CONVERTED');

-- Cascade context down to dispositions belonging to those categories
UPDATE public.dispositions
SET crm_context = 'b2b'
WHERE category_id IN (
    SELECT id FROM public.disposition_categories WHERE crm_context = 'b2b'
);

-- Additionally, mark specific B2B dispositions that were grouped into shared categories (like 'CONTACTED' or 'OBJECTION / BARRIER')
UPDATE public.dispositions
SET crm_context = 'b2b'
WHERE name IN (
    'Qualified Partner', 
    'Potential Partner', 
    'Payout Concern', 
    'Trust Concern',
    'Partner Activated'
);

-- Create an index to optimize filtering by context
CREATE INDEX IF NOT EXISTS idx_disposition_categories_context ON public.disposition_categories(crm_context);
CREATE INDEX IF NOT EXISTS idx_dispositions_context ON public.dispositions(crm_context);
