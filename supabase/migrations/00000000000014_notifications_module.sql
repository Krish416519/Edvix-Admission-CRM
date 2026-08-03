-- =============================================================================
-- 00000000000014_notifications_module.sql
-- Production-ready Notification Engine for Edvix AI CRM
-- =============================================================================

--------------------------------------------------
-- STEP 1: DROP OLD TABLES (if any)
--------------------------------------------------
DROP TABLE IF EXISTS public.notification_delivery_logs CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.notification_channels CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

--------------------------------------------------
-- STEP 2: SEQUENCES
--------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.notification_number_seq START 1;

--------------------------------------------------
-- STEP 3: CORE TABLES
--------------------------------------------------

-- 3.1 CHANNELS
CREATE TABLE public.notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- 'In-App', 'Browser', 'Email', 'WhatsApp', 'SMS', 'Push'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Channels
INSERT INTO public.notification_channels (name) VALUES 
('In-App'), ('Browser'), ('Email'), ('WhatsApp'), ('SMS'), ('Push')
ON CONFLICT DO NOTHING;

-- 3.2 TEMPLATES
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    module VARCHAR(100) NOT NULL,
    default_title TEXT NOT NULL,
    default_message TEXT NOT NULL,
    default_priority VARCHAR(50) NOT NULL DEFAULT 'Low',
    channel_id UUID REFERENCES public.notification_channels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_number VARCHAR(50) UNIQUE NOT NULL DEFAULT '',
    
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    module VARCHAR(100) NOT NULL, -- 'Leads', 'Tasks', 'Admissions', 'Documents', 'Finance', 'System'
    module_record_id UUID,        -- Reference to the specific entity
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    channel VARCHAR(50) NOT NULL DEFAULT 'In-App',
    priority VARCHAR(50) NOT NULL DEFAULT 'Low' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    category VARCHAR(100),
    
    status VARCHAR(50) NOT NULL DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read', 'Archived', 'Deleted')),
    
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 PREFERENCES
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    
    browser_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    finance_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    task_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    ai_insights BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 DELIVERY LOGS
CREATE TABLE public.notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    
    channel VARCHAR(50) NOT NULL,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Sent', 'Delivered', 'Read', 'Failed')),
    
    sent_time TIMESTAMPTZ,
    read_time TIMESTAMPTZ,
    
    failure_reason TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- STEP 4: TRIGGERS & FUNCTIONS
--------------------------------------------------

-- Number Generator
CREATE OR REPLACE FUNCTION public.generate_notification_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.notification_number = '' OR NEW.notification_number IS NULL THEN
        NEW.notification_number := 'NOTIF-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('public.notification_number_seq')::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_notification_number BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.generate_notification_number();

-- Auto-update timestamps
CREATE TRIGGER set_updated_at_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_notification_prefs BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_notification_templates BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 5: AUTOMATED ENGINE TRIGGERS (CRM Modules -> Notifications)
--------------------------------------------------

-- Helper function to conditionally insert if preferences allow
CREATE OR REPLACE FUNCTION public.insert_notification_if_preferred(
    p_user_id UUID, p_module VARCHAR, p_record_id UUID, p_title TEXT, p_msg TEXT, p_pref_type VARCHAR, p_priority VARCHAR DEFAULT 'Low'
) RETURNS VOID AS $$
DECLARE
    v_pref BOOLEAN;
BEGIN
    IF p_user_id IS NULL THEN RETURN; END IF;
    
    -- Check user preference based on type
    SELECT 
        CASE p_pref_type
            WHEN 'task_reminders' THEN task_reminders
            WHEN 'finance_alerts' THEN finance_alerts
            ELSE TRUE -- default
        END INTO v_pref
    FROM public.notification_preferences WHERE user_id = p_user_id;

    -- If no preference record exists or preference is true, send it
    IF COALESCE(v_pref, TRUE) THEN
        INSERT INTO public.notifications (recipient_id, module, module_record_id, title, message, priority, category)
        VALUES (p_user_id, p_module, p_record_id, p_title, p_msg, p_priority, p_pref_type);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 LEADS Trigger
CREATE OR REPLACE FUNCTION public.notify_lead_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'New Lead Assigned', 'Lead ' || NEW.full_name || ' was assigned to you.', 'general', 'High');
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Assigned', 'Lead ' || NEW.full_name || ' was assigned to you.', 'general', 'High');
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Status Changed', 'Lead ' || NEW.full_name || ' status changed to ' || NEW.status, 'general');
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_notify_lead_changes AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.notify_lead_changes();

-- 5.2 TASKS Trigger
CREATE OR REPLACE FUNCTION public.notify_task_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.assigned_user IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(NEW.assigned_user, 'Tasks', NEW.id, 'New Task Assigned', NEW.title, 'task_reminders', 'High');
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'Pending' AND OLD.status != 'Pending' AND NEW.assigned_user IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(NEW.assigned_user, 'Tasks', NEW.id, 'Task Re-opened', NEW.title, 'task_reminders');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_notify_task_changes AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_changes();

-- 5.3 ADMISSIONS Trigger
CREATE OR REPLACE FUNCTION public.notify_admission_changes() RETURNS TRIGGER AS $$
DECLARE v_counselor UUID; v_lead_name TEXT;
BEGIN
    -- Get assigned counselor
    SELECT assigned_counselor, full_name INTO v_counselor, v_lead_name FROM public.leads WHERE id = NEW.lead_id;
    
    IF TG_OP = 'INSERT' AND v_counselor IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(v_counselor, 'Admissions', NEW.id, 'Admission Created', 'Admission ' || NEW.admission_number || ' created for ' || v_lead_name, 'general');
    ELSIF TG_OP = 'UPDATE' AND NEW.current_stage IS DISTINCT FROM OLD.current_stage AND v_counselor IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(v_counselor, 'Admissions', NEW.id, 'Admission Stage Updated', 'Admission ' || NEW.admission_number || ' moved to ' || NEW.current_stage, 'general');
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_notify_admission_changes AFTER INSERT OR UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.notify_admission_changes();

-- 5.4 DOCUMENTS Trigger
CREATE OR REPLACE FUNCTION public.notify_document_changes() RETURNS TRIGGER AS $$
DECLARE v_counselor UUID;
BEGIN
    SELECT assigned_counselor INTO v_counselor FROM public.leads WHERE id = (SELECT lead_id FROM public.admissions WHERE id = NEW.admission_id);
    IF TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status AND v_counselor IS NOT NULL THEN
        IF NEW.verification_status = 'Verified' THEN
            PERFORM public.insert_notification_if_preferred(v_counselor, 'Documents', NEW.id, 'Document Verified', 'Document ' || NEW.document_type || ' was verified.', 'general');
        ELSIF NEW.verification_status = 'Rejected' THEN
            PERFORM public.insert_notification_if_preferred(v_counselor, 'Documents', NEW.id, 'Document Rejected', 'Document ' || NEW.document_type || ' was rejected.', 'general', 'High');
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_notify_document_changes AFTER UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.notify_document_changes();

-- 5.5 FINANCE Trigger
CREATE OR REPLACE FUNCTION public.notify_finance_changes() RETURNS TRIGGER AS $$
DECLARE v_counselor UUID;
BEGIN
    SELECT assigned_counselor INTO v_counselor FROM public.leads WHERE id = NEW.lead_id;
    IF TG_OP = 'INSERT' AND v_counselor IS NOT NULL THEN
        PERFORM public.insert_notification_if_preferred(v_counselor, 'Finance', NEW.id, 'Payment Received', 'Payment ' || NEW.payment_number || ' recorded.', 'finance_alerts');
    ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND v_counselor IS NOT NULL THEN
        IF NEW.status = 'Paid' THEN
            PERFORM public.insert_notification_if_preferred(v_counselor, 'Finance', NEW.id, 'Payment Confirmed', 'Payment ' || NEW.payment_number || ' marked as Paid.', 'finance_alerts');
        ELSIF NEW.status = 'Failed' THEN
            PERFORM public.insert_notification_if_preferred(v_counselor, 'Finance', NEW.id, 'Payment Failed', 'Payment ' || NEW.payment_number || ' has failed.', 'finance_alerts', 'High');
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_notify_finance_changes AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.notify_finance_changes();


--------------------------------------------------
-- STEP 6: TIMELINE LOGGING (Notifications -> Activity)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_notification_timeline()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_lead_id UUID;
    v_activity_type VARCHAR;
    v_content TEXT;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
    
    IF TG_TABLE_NAME = 'notifications' THEN
        -- Try to resolve lead_id if possible
        IF NEW.module = 'Leads' THEN v_lead_id := NEW.module_record_id;
        ELSIF NEW.module = 'Admissions' THEN SELECT lead_id INTO v_lead_id FROM public.admissions WHERE id = NEW.module_record_id;
        ELSIF NEW.module = 'Tasks' THEN SELECT lead_id INTO v_lead_id FROM public.tasks WHERE id = NEW.module_record_id;
        ELSIF NEW.module = 'Documents' THEN SELECT lead_id INTO v_lead_id FROM public.admissions WHERE id = (SELECT admission_id FROM public.documents WHERE id = NEW.module_record_id);
        ELSIF NEW.module = 'Finance' THEN SELECT lead_id INTO v_lead_id FROM public.payments WHERE id = NEW.module_record_id;
        END IF;

        IF v_lead_id IS NOT NULL THEN
            IF TG_OP = 'UPDATE' AND NEW.status = 'Read' AND OLD.status = 'Unread' THEN
                v_activity_type := 'status_change';
                v_content := 'Notification Read: ' || NEW.title;
                INSERT INTO public.lead_activities (lead_id, type, content, author, metadata) VALUES (v_lead_id, v_activity_type, v_content, COALESCE(v_user_name, 'System'), jsonb_build_object('notification_id', NEW.id));
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER trg_log_notification_timeline AFTER UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.log_notification_timeline();

--------------------------------------------------
-- STEP 7: INDEXES
--------------------------------------------------
CREATE INDEX idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

--------------------------------------------------
-- STEP 8: ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- Users can access their own notifications and preferences
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY "Users manage own preferences" ON public.notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid());

-- Admins can do anything
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins full access templates" ON public.notification_templates FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins full access logs" ON public.notification_delivery_logs FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Admins full access channels" ON public.notification_channels FOR ALL TO authenticated USING (public.is_admin());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

--------------------------------------------------
-- STEP 9: REALTIME
--------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
