-- =============================================================
-- 00000000000033_confirm_user_email.sql
-- Manually confirms the email address for a specific user.
-- Run this in your Supabase SQL Editor.
-- =============================================================

UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'edvix.edu@gmail.com';
