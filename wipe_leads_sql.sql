-- Drop all data permanently (instantly, bypassing row limits)
TRUNCATE TABLE public.leads CASCADE;
TRUNCATE TABLE public.lead_activities CASCADE;
TRUNCATE TABLE public.notifications CASCADE;

-- This will clear all existing leads, activities, and related notifications so you can import fresh data!
