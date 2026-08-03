-- 00000000000018_whatsapp_module.sql
-- Edvix AI CRM - WhatsApp Business Integration Schema

DROP TABLE IF EXISTS public.whatsapp_delivery_logs CASCADE;
DROP TABLE IF EXISTS public.whatsapp_campaigns CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.whatsapp_conversations CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_contacts CASCADE;
DROP TABLE IF EXISTS public.whatsapp_accounts CASCADE;

--------------------------------------------------
-- 1. WHATSAPP ACCOUNTS (Provider credentials per org)
--------------------------------------------------
CREATE TABLE public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'meta' CHECK (provider IN ('meta', 'twilio', 'interakt', 'wati', 'aisensy')),
    phone_number VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(255),
    business_account_id VARCHAR(255),
    access_token_encrypted TEXT,  -- Encrypted in production
    webhook_verify_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert demo account (inactive, no real credentials)
INSERT INTO public.whatsapp_accounts (name, provider, phone_number, is_active)
VALUES ('Edvix WhatsApp', 'meta', '+91-XXXXXXXXXX', false);

--------------------------------------------------
-- 2. WHATSAPP CONTACTS (Mapped to leads)
--------------------------------------------------
CREATE TABLE public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    wa_id VARCHAR(100),  -- WhatsApp internal ID from provider
    name VARCHAR(255),
    is_opted_in BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wa_contacts_phone ON public.whatsapp_contacts(phone_number);
CREATE INDEX idx_wa_contacts_lead ON public.whatsapp_contacts(lead_id);

--------------------------------------------------
-- 3. WHATSAPP CONVERSATIONS
--------------------------------------------------
CREATE TABLE public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    unread_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_message_snippet TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_convs_lead ON public.whatsapp_conversations(lead_id);
CREATE INDEX idx_wa_convs_last_msg ON public.whatsapp_conversations(last_message_at DESC);

--------------------------------------------------
-- 4. WHATSAPP MESSAGES
--------------------------------------------------
CREATE TABLE public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    provider_message_id VARCHAR(255),  -- ID returned by Meta/Twilio API
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('counselor', 'student', 'system')),
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'pdf', 'document', 'audio', 'video', 'location', 'template', 'interactive')),
    content TEXT,
    media_url TEXT,
    file_name VARCHAR(255),
    file_size VARCHAR(50),
    template_id UUID,
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'retrying')),
    is_internal_note BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msgs_conv ON public.whatsapp_messages(conversation_id, created_at ASC);

--------------------------------------------------
-- 5. WHATSAPP TEMPLATES
--------------------------------------------------
CREATE TABLE public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    provider_template_name VARCHAR(255),  -- Approved template name in Meta
    language_code VARCHAR(20) DEFAULT 'en_US',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Templates
INSERT INTO public.whatsapp_templates (name, category, content, variables) VALUES
('Welcome Message', 'Welcome', 'Hi {{name}}, welcome to Edvix! I am your assigned counselor. Let me know if you have any questions about {{course}}.', '["name", "course"]'),
('Follow-up Reminder', 'Follow-up', 'Hi {{name}}, just checking in on your interest in {{course}} at {{university}}. Can we schedule a call this week?', '["name", "course", "university"]'),
('Fee Reminder', 'Fee Reminder', 'Dear {{name}}, this is a gentle reminder that your fee payment for {{course}} is pending. Please complete it by {{date}}.', '["name", "course", "date"]'),
('Document Reminder', 'Document Reminder', 'Hi {{name}}, we are still waiting for your {{document}}. Please upload it as soon as possible to proceed with your admission.', '["name", "document"]'),
('Admission Confirmation', 'Admission Confirmation', 'Congratulations {{name}}! Your admission to {{course}} at {{university}} has been confirmed. Welcome to the Edvix family!', '["name", "course", "university"]'),
('Payment Confirmation', 'Payment Confirmation', 'Dear {{name}}, we have received your payment of ₹{{amount}} for {{course}}. Your receipt number is {{receipt_no}}.', '["name", "amount", "course", "receipt_no"]'),
('Scholarship Notification', 'Scholarship', 'Great news {{name}}! You are eligible for a {{percent}}% scholarship on {{course}}. This offer is valid until {{expiry_date}}. Contact us to avail it!', '["name", "percent", "course", "expiry_date"]'),
('Document Rejection', 'Document Reminder', 'Hi {{name}}, unfortunately your {{document_type}} was rejected due to: {{reason}}. Please re-upload the correct document to continue your admission.', '["name", "document_type", "reason"]');

--------------------------------------------------
-- 6. WHATSAPP CAMPAIGNS (Broadcasts)
--------------------------------------------------
CREATE TABLE public.whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.whatsapp_accounts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    audience_filters JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
    scheduled_for TIMESTAMPTZ,
    total_targeted INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 7. WHATSAPP DELIVERY LOGS
--------------------------------------------------
CREATE TABLE public.whatsapp_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL,
    provider_status VARCHAR(100),
    provider_response JSONB,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_delivery_logs_msg ON public.whatsapp_delivery_logs(message_id);

--------------------------------------------------
-- 8. ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Templates: everyone can read
CREATE POLICY "Authenticated users can view templates"
    ON public.whatsapp_templates FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Accounts: only admins
CREATE POLICY "Admins can manage WhatsApp accounts"
    ON public.whatsapp_accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Conversations: all authenticated users
CREATE POLICY "Authenticated users can view conversations"
    ON public.whatsapp_conversations FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert conversations"
    ON public.whatsapp_conversations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update conversations"
    ON public.whatsapp_conversations FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Contacts: all authenticated
CREATE POLICY "Authenticated users can manage contacts"
    ON public.whatsapp_contacts FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Messages: all authenticated
CREATE POLICY "Authenticated users can view messages"
    ON public.whatsapp_messages FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert messages"
    ON public.whatsapp_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update messages"
    ON public.whatsapp_messages FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Campaigns: admins only
CREATE POLICY "Admins can manage campaigns"
    ON public.whatsapp_campaigns FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Delivery logs: admins
CREATE POLICY "Anyone can insert delivery logs"
    ON public.whatsapp_delivery_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view delivery logs"
    ON public.whatsapp_delivery_logs FOR SELECT
    USING (auth.uid() IS NOT NULL);

--------------------------------------------------
-- 9. TRIGGERS
--------------------------------------------------
CREATE TRIGGER set_wa_accounts_updated_at
    BEFORE UPDATE ON public.whatsapp_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_wa_conversations_updated_at
    BEFORE UPDATE ON public.whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_wa_messages_updated_at
    BEFORE UPDATE ON public.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
