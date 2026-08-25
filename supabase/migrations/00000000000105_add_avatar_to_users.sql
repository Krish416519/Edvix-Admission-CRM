-- Add avatar column to users table for profile photo storage
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar TEXT;
