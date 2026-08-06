-- 00000000000039_fix_security_events_rls.sql
-- Enable RLS and add policies for security_events

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read security_events" ON public.security_events;
DROP POLICY IF EXISTS "Admins manage security_events" ON public.security_events;
CREATE POLICY "Admins manage security_events" ON public.security_events
  FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.user_role() IN ('Super Admin', 'Admin'));
