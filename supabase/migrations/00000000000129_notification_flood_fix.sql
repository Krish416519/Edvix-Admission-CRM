-- =============================================================================
-- 00000000000129_notification_flood_fix.sql
-- Fix notification flood: add dedupe_key column and expand unique index
-- =============================================================================

-- Add dedupe_key column for canonical notification identity
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Create index on dedupe_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key 
ON public.notifications(recipient_id, dedupe_key) 
WHERE dedupe_key IS NOT NULL AND status = 'Unread';

-- Clean up any existing duplicate task notifications before recreating the unique index
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.ctid > b.ctid
  AND a.recipient_id = b.recipient_id
  AND a.module_record_id = b.module_record_id
  AND a.category = b.category
  AND a.category IN ('task_due_soon', 'task_due_now', 'task_overdue');

-- Drop the old partial unique index and recreate with expanded coverage
-- OLD: only covered 'task_due_soon' and 'task_overdue'
-- NEW: covers ALL task reminder categories including 'task_due_now'
DROP INDEX IF EXISTS public.idx_notifications_task_dedup;

CREATE UNIQUE INDEX idx_notifications_task_dedup 
ON public.notifications (recipient_id, module_record_id, category)
WHERE category IN ('task_due_soon', 'task_due_now', 'task_overdue');

-- Create a canonical idempotent notification insertion function
-- This replaces direct INSERT calls for task reminders with a dedupe-aware upsert
CREATE OR REPLACE FUNCTION public.insert_notification_dedup(
    p_recipient_id UUID,
    p_module VARCHAR,
    p_record_id UUID,
    p_title TEXT,
    p_msg TEXT,
    p_category VARCHAR,
    p_priority VARCHAR DEFAULT 'Low',
    p_dedupe_key TEXT DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    IF p_recipient_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- If a dedupe_key is provided, try to find an existing unread notification with that key
    IF p_dedupe_key IS NOT NULL THEN
        SELECT id INTO v_notification_id
        FROM public.notifications
        WHERE recipient_id = p_recipient_id
          AND dedupe_key = p_dedupe_key
          AND status = 'Unread'
        LIMIT 1;

        -- If found, update its content (bump timestamp, keep unread) and return the existing ID
        IF v_notification_id IS NOT NULL THEN
            UPDATE public.notifications
            SET title = p_title,
                message = p_msg,
                priority = p_priority,
                updated_at = NOW()
            WHERE id = v_notification_id;
            RETURN v_notification_id;
        END IF;
    END IF;

    -- No existing notification — insert a new one
    INSERT INTO public.notifications (
        recipient_id, module, module_record_id, title, message,
        priority, category, dedupe_key, organization_id, status
    ) VALUES (
        p_recipient_id, p_module, p_record_id, p_title, p_msg,
        p_priority, p_category, p_dedupe_key, p_organization_id, 'Unread'
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
