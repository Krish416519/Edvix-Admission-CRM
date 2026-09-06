-- Migration: Add special_form_type to dispositions table
-- This makes special form rendering data-driven (by ID/type) instead of name-based string matching.
-- This eliminates the bug where renaming a disposition removes its special form.

ALTER TABLE public.dispositions 
  ADD COLUMN IF NOT EXISTS special_form_type TEXT DEFAULT NULL;

-- Allowed values for special_form_type:
-- 'counselled'       → Shows counseling details form
-- 'semester_fee_paid' → Shows enrollment/fee details form  
-- 'loan_rejected'    → Shows loan rejected details form
-- 'meeting_done'     → Shows meeting screenshot upload
-- 'document_collected' → Shows document link/file upload
-- NULL               → No special form

COMMENT ON COLUMN public.dispositions.special_form_type IS 
  'Controls which special UI form is shown in the DispositionWidget. Values: counselled, semester_fee_paid, loan_rejected, meeting_done, document_collected, NULL';

-- Seed existing dispositions with their special_form_type based on their current names.
-- After this migration, admins can freely rename dispositions without breaking the UI.
UPDATE public.dispositions SET special_form_type = 'counselled'
  WHERE name ILIKE 'counselled' AND special_form_type IS NULL;

UPDATE public.dispositions SET special_form_type = 'semester_fee_paid'
  WHERE name ILIKE 'semester fee paid' AND special_form_type IS NULL;

UPDATE public.dispositions SET special_form_type = 'loan_rejected'
  WHERE name ILIKE 'loan rejected' AND special_form_type IS NULL;

UPDATE public.dispositions SET special_form_type = 'meeting_done'
  WHERE name ILIKE 'meeting done' AND special_form_type IS NULL;

UPDATE public.dispositions SET special_form_type = 'document_collected'
  WHERE name ILIKE 'document collected' AND special_form_type IS NULL;

-- Grant permissions
GRANT SELECT, UPDATE ON public.dispositions TO authenticated;
