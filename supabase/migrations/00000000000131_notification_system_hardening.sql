-- =============================================================================
-- 00000000000131_notification_system_hardening.sql
-- Fix task notification lifecycle: exactly 2 events per task (reminder + due)
-- Fix existingKeys pre-check to check ALL non-Deleted notifications
-- Add metadata.link for task click routing
-- =============================================================================

-- 1. Update unique index: remove 'task_overdue' (not a legitimate event per business rules)
--    Keep only 'task_due_soon' and 'task_due_now' — exactly TWO events per task
DROP INDEX IF EXISTS public.idx_notifications_task_dedup;
CREATE UNIQUE INDEX idx_notifications_task_dedup 
ON public.notifications (recipient_id, module_record_id, category)
WHERE category IN ('task_due_soon', 'task_due_now');

-- 2. Index for fast dedupe_key lookups (including Read notifications for pre-check)
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key_lookup 
ON public.notifications(recipient_id, module_record_id, category, status) 
WHERE status != 'Deleted' AND category IN ('task_due_soon', 'task_due_now');

-- 3. Index for metadata-based routing lookups
CREATE INDEX IF NOT EXISTS idx_notifications_module_record 
ON public.notifications(recipient_id, module, module_record_id) 
WHERE status = 'Unread' AND module = 'Tasks';
