-- =============================================================================
-- 00000000000117_allow_insert_notifications.sql
-- Allow users to insert their own notifications (required for client-side Task Reminders)
-- =============================================================================

-- Add INSERT policy for authenticated users so the client-side Task Scheduler can generate reminders
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (recipient_id = auth.uid());
