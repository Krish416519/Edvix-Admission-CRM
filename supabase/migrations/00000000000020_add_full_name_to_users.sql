-- Migration: Add full_name column to public.users
-- This migration adds a new column to store the user's full name, which the seed script expects.

ALTER TABLE public.users
ADD COLUMN full_name VARCHAR(255);

-- Populate existing rows with the current name value, if any
UPDATE public.users SET full_name = name WHERE full_name IS NULL;
