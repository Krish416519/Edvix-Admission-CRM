-- Migration: Ensure Super Admin role exists and assign to degreepartners@gmail.com
-- Idempotent: safe to run multiple times

BEGIN;

-- Insert role if missing
INSERT INTO public.roles (name)
VALUES ('Super Admin')
ON CONFLICT (name) DO NOTHING;

-- Assign role to user (if user exists)
UPDATE public.users
SET role_id = (SELECT id FROM public.roles WHERE name = 'Super Admin')
WHERE email = 'degreepartners@gmail.com';

COMMIT;
