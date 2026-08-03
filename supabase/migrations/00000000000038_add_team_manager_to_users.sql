-- 00000000000038_add_team_manager_to_users.sql
-- Add team and manager_id to users

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS team VARCHAR(100),
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
