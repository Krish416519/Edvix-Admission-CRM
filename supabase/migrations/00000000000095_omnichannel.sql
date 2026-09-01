-- =============================================================================
-- 00000000000095_omnichannel.sql
-- Step 33: Omnichannel Communication Hub
-- =============================================================================

--------------------------------------------------
-- 1. Communication Preferences (Opt-outs)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'marketing')),
    is_allowed BOOLEAN DEFAULT TRUE,
    source VARCHAR(100),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one preference row per lead + channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_pref_lead_channel ON public.communication_preferences(lead_id, channel);

--------------------------------------------------
-- 2. Email & SMS Messages
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('counselor', 'student', 'system')),
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    content TEXT,
    thread_id VARCHAR(255), -- Threading via external provider
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'bounced', 'complaint')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('counselor', 'student', 'system')),
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 3. Unified Timeline Trigger
--------------------------------------------------
-- A function that logs an activity whenever a communication is sent or received
CREATE OR REPLACE FUNCTION public.log_omni_communication_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type VARCHAR(100);
    activity_content TEXT;
    contact_name TEXT;
    author_name TEXT;
BEGIN
    -- Determine the channel and content
    IF TG_TABLE_NAME = 'whatsapp_messages' THEN
        activity_type := 'whatsapp';
        activity_content := COALESCE(NEW.content, 'Media/Template message');
    ELSIF TG_TABLE_NAME = 'email_messages' THEN
        activity_type := 'email';
        activity_content := COALESCE(NEW.subject, 'No Subject') || ' - ' || substring(COALESCE(NEW.content, '') from 1 for 100);
    ELSIF TG_TABLE_NAME = 'sms_messages' THEN
        activity_type := 'sms';
        activity_content := COALESCE(NEW.content, 'SMS Message');
    ELSE
        RETURN NEW;
    END IF;

    -- Determine author (counselor or system or student)
    IF NEW.sender_type = 'counselor' THEN
        SELECT full_name INTO author_name FROM public.users WHERE id = NEW.sender_id;
    ELSIF NEW.sender_type = 'student' THEN
        author_name := 'Student';
    ELSE
        author_name := 'System Automation';
    END IF;

    -- For WhatsApp we need to resolve lead_id from conversation_id
    IF TG_TABLE_NAME = 'whatsapp_messages' THEN
        INSERT INTO public.lead_activities (lead_id, type, content, author, metadata)
        SELECT 
            lead_id, 
            activity_type, 
            activity_content, 
            author_name,
            jsonb_build_object('message_id', NEW.id, 'status', NEW.status, 'direction', CASE WHEN NEW.sender_type = 'student' THEN 'inbound' ELSE 'outbound' END)
        FROM public.whatsapp_conversations 
        WHERE id = NEW.conversation_id AND lead_id IS NOT NULL;
    ELSE
        INSERT INTO public.lead_activities (lead_id, type, content, author, metadata)
        VALUES (
            NEW.lead_id, 
            activity_type, 
            activity_content, 
            author_name,
            jsonb_build_object('message_id', NEW.id, 'status', NEW.status, 'direction', CASE WHEN NEW.sender_type = 'student' THEN 'inbound' ELSE 'outbound' END)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers (only on insert)
DROP TRIGGER IF EXISTS on_whatsapp_message_activity ON public.whatsapp_messages;
CREATE TRIGGER on_whatsapp_message_activity
    AFTER INSERT ON public.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION public.log_omni_communication_activity();

DROP TRIGGER IF EXISTS on_email_message_activity ON public.email_messages;
CREATE TRIGGER on_email_message_activity
    AFTER INSERT ON public.email_messages
    FOR EACH ROW EXECUTE FUNCTION public.log_omni_communication_activity();

DROP TRIGGER IF EXISTS on_sms_message_activity ON public.sms_messages;
CREATE TRIGGER on_sms_message_activity
    AFTER INSERT ON public.sms_messages
    FOR EACH ROW EXECUTE FUNCTION public.log_omni_communication_activity();

--------------------------------------------------
-- 4. Unified Conversations View
--------------------------------------------------
-- This view aggregates the latest state for WhatsApp, Email, and SMS per lead
CREATE OR REPLACE VIEW public.unified_conversations AS
SELECT 
    'whatsapp' as channel,
    wc.id::varchar as conversation_id,
    wc.lead_id,
    l.first_name as lead_name,
    wc.assigned_user_id as assigned_to,
    wc.status,
    wc.unread_count,
    wc.last_message_at as last_activity_at,
    wc.last_message_snippet as last_message
FROM public.whatsapp_conversations wc
LEFT JOIN public.leads l ON wc.lead_id = l.id
WHERE wc.lead_id IS NOT NULL

UNION ALL

-- For Email, we group by lead_id to create a virtual "conversation"
SELECT 
    'email' as channel,
    em.lead_id::varchar as conversation_id, -- Virtual ID
    em.lead_id,
    l.first_name as lead_name,
    l.assigned_counselor as assigned_to,
    'open' as status,
    0 as unread_count,
    MAX(em.created_at) as last_activity_at,
    (SELECT subject FROM public.email_messages WHERE lead_id = em.lead_id ORDER BY created_at DESC LIMIT 1) as last_message
FROM public.email_messages em
LEFT JOIN public.leads l ON em.lead_id = l.id
GROUP BY em.lead_id, l.first_name, l.assigned_counselor

UNION ALL

-- For SMS, we group by lead_id
SELECT 
    'sms' as channel,
    sm.lead_id::varchar as conversation_id, -- Virtual ID
    sm.lead_id,
    l.first_name as lead_name,
    l.assigned_counselor as assigned_to,
    'open' as status,
    0 as unread_count,
    MAX(sm.created_at) as last_activity_at,
    (SELECT substring(content from 1 for 60) FROM public.sms_messages WHERE lead_id = sm.lead_id ORDER BY created_at DESC LIMIT 1) as last_message
FROM public.sms_messages sm
LEFT JOIN public.leads l ON sm.lead_id = l.id
GROUP BY sm.lead_id, l.first_name, l.assigned_counselor;

--------------------------------------------------
-- 5. Row Level Security
--------------------------------------------------
ALTER TABLE public.communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view preferences" ON public.communication_preferences;
CREATE POLICY "Authenticated users can view preferences" ON public.communication_preferences FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update preferences" ON public.communication_preferences;
CREATE POLICY "Authenticated users can update preferences" ON public.communication_preferences FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view emails" ON public.email_messages;
CREATE POLICY "Authenticated users can view emails" ON public.email_messages FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert emails" ON public.email_messages;
CREATE POLICY "Authenticated users can insert emails" ON public.email_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update emails" ON public.email_messages;
CREATE POLICY "Authenticated users can update emails" ON public.email_messages FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view sms" ON public.sms_messages;
CREATE POLICY "Authenticated users can view sms" ON public.sms_messages FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert sms" ON public.sms_messages;
CREATE POLICY "Authenticated users can insert sms" ON public.sms_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update sms" ON public.sms_messages;
CREATE POLICY "Authenticated users can update sms" ON public.sms_messages FOR UPDATE USING (auth.uid() IS NOT NULL);
