-- Fix existing organizations with NULL crm_context
-- The DEFAULT 'academic' only applies to new rows, not existing ones

UPDATE public.organizations
SET crm_context = 'academic'
WHERE crm_context IS NULL;

-- Also fix any leads that might have organization_id pointing to organizations with NULL crm_context
-- This ensures all leads inherit a valid context through their organization
