-- 00000000000009_lead_validation.sql

-- 1. NOT NULL constraints for critical fields
-- Ensure first_name and phone are always present
ALTER TABLE public.leads 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

-- 1.5 Handle Existing Duplicates
-- Soft-delete older duplicate leads (keeping the newest one) so the unique index can be created.
-- You can later find these in the UI by toggling "Show Deleted" and use the Merge tool.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER(PARTITION BY phone ORDER BY created_at DESC) as rn
  FROM public.leads
  WHERE deleted_at IS NULL
)
UPDATE public.leads
SET deleted_at = NOW()
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Partial Unique Index for Phone
-- We want to prevent duplicate phone numbers among ACTIVE leads.
-- If a lead is soft-deleted, its phone number is freed up.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_phone_unique 
  ON public.leads(phone) 
  WHERE deleted_at IS NULL;

-- 3. Email Validation
-- Add a CHECK constraint to ensure email, if provided, looks like an email address
ALTER TABLE public.leads 
  ADD CONSTRAINT leads_email_check 
  CHECK (
    email IS NULL OR 
    email = '' OR 
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
