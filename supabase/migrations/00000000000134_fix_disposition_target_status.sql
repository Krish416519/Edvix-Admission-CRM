-- =============================================================================
-- 00000000000134_fix_disposition_target_status.sql
-- Fix: Several dispositions have incorrect or NULL target_status values,
--      causing leads to be misclassified in the HOT/WARM/COLD intent system.
--
-- Disposition target_status → lead_status → computeIntent() → intent counts
--
-- Bugs:
-- 1. "Follow Up" → target_status = 'Not Connected' (should be 'Warm')
-- 2. "Wants More Information" → target_status = 'Hot' (should be 'Warm')
-- 3. "Payout Concern" → target_status = NULL (should be 'Warm')
-- 4. "Trust Concern" → target_status = NULL (should be 'Warm')
-- 5. "Call Back Requested" → target_status = 'Not Connected' (should be 'Cold')
--
-- These mismatches cause:
-- - Follow Up leads incorrectly classified as COLD instead of WARM
-- - Wants More Information leads incorrectly classified as HOT instead of WARM
-- - Payout/Trust Concern leads never transition from current status
-- =============================================================================

-- Only update dispositions where the target_status is incorrect or NULL
UPDATE public.dispositions SET target_status = 'Warm'
WHERE name = 'Follow Up' AND target_status != 'Warm';

UPDATE public.dispositions SET target_status = 'Warm'
WHERE name = 'Wants More Information' AND target_status != 'Warm';

UPDATE public.dispositions SET target_status = 'Warm'
WHERE name = 'Payout Concern' AND target_status IS DISTINCT FROM 'Warm';

UPDATE public.dispositions SET target_status = 'Warm'
WHERE name = 'Trust Concern' AND target_status IS DISTINCT FROM 'Warm';

UPDATE public.dispositions SET target_status = 'Cold'
WHERE name = 'Call Back Requested' AND target_status != 'Cold';

-- Note: There are duplicate "Call Back Requested" and "Invalid Number" rows
-- from different seed migrations. Update ALL matching rows.
