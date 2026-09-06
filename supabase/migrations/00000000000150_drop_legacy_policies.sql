-- 00000000000150_drop_legacy_policies.sql

-- Drop the overly permissive legacy policy on domains
DROP POLICY IF EXISTS "Anyone can read domains" ON public.domains;

-- We already have the new strict policy from 149:
-- CREATE POLICY "Authenticated users can read domains" ON public.domains FOR SELECT USING (auth.role() = 'authenticated');
