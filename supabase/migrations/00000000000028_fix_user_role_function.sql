-- Fix user_role function to correctly extract role from JWT
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'), 
    ''
  )::text;
$$ LANGUAGE sql STABLE;
