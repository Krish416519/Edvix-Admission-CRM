-- 00000000000019_email_module.sql
-- Edvix AI CRM - Email Communication Center Schema

DROP TABLE IF EXISTS public.email_delivery_logs CASCADE;
DROP TABLE IF EXISTS public.email_attachments CASCADE;
DROP TABLE IF EXISTS public.email_messages CASCADE;
DROP TABLE IF EXISTS public.email_campaigns CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.email_accounts CASCADE;

--------------------------------------------------
-- 1. EMAIL ACCOUNTS (Provider config)
--------------------------------------------------
CREATE TABLE public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend', 'smtp', 'sendgrid', 'ses', 'mailgun')),
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL DEFAULT 'Edvix CRM',
    reply_to_email VARCHAR(255),
    api_key_encrypted TEXT,          -- Encrypted at rest
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password_encrypted TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert demo account (inactive)
INSERT INTO public.email_accounts (name, provider, from_email, from_name, is_active)
VALUES ('Edvix Mail', 'resend', 'noreply@edvix.in', 'Edvix Admissions', false);

--------------------------------------------------
-- 2. EMAIL TEMPLATES
--------------------------------------------------
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 10 default templates
INSERT INTO public.email_templates (name, category, subject_template, body_template, variables) VALUES
(
  'Welcome Email', 'Welcome',
  'Welcome to Edvix, {{student_name}}!',
  '<p>Hi {{student_name}},</p><p>Welcome to Edvix! We are thrilled to have you on board.</p><p>Your counselor <strong>{{counselor}}</strong> will reach out shortly to guide you through the <strong>{{course}}</strong> admission process.</p><p>Best regards,<br>The Edvix Team</p>',
  '["student_name", "course", "counselor"]'
),
(
  'Lead Follow-up', 'Follow-up',
  'Following up on your interest in {{course}}',
  '<p>Hi {{student_name}},</p><p>I wanted to follow up on your interest in <strong>{{course}}</strong> at <strong>{{university}}</strong>.</p><p>Can we schedule a call to discuss your admission requirements and scholarship options?</p><p>Looking forward to hearing from you,<br>{{counselor}}</p>',
  '["student_name", "course", "university", "counselor"]'
),
(
  'Document Reminder', 'Document Reminder',
  'Action Required: Pending Documents for Your Admission',
  '<p>Hi {{student_name}},</p><p>We are currently reviewing your application but noticed some documents are still pending.</p><p>Please upload the required documents through your portal as soon as possible to avoid delays in your admission process.</p><p>Regards,<br>{{counselor}}</p>',
  '["student_name", "counselor"]'
),
(
  'Fee Reminder', 'Fee Reminder',
  'Reminder: Fee Payment Due for {{course}}',
  '<p>Dear {{student_name}},</p><p>This is a friendly reminder that your fee payment of <strong>₹{{fee}}</strong> for <strong>{{course}}</strong> is due.</p><p>Please complete your payment using the link below:</p><p><a href="{{payment_link}}">Pay Now</a></p><p>Contact us if you need assistance with EMI options.</p><p>Regards,<br>Edvix Accounts Team</p>',
  '["student_name", "course", "fee", "payment_link"]'
),
(
  'Payment Confirmation', 'Payment Confirmation',
  'Payment Confirmed for {{course}}',
  '<p>Dear {{student_name}},</p><p>We have successfully received your payment for <strong>{{course}}</strong> at <strong>{{university}}</strong>.</p><p>Your receipt has been attached to this email for your records.</p><p>Thank you for choosing Edvix.</p><p>Regards,<br>Edvix Finance Team</p>',
  '["student_name", "course", "university"]'
),
(
  'Admission Confirmation', 'Admission Confirmation',
  'Congratulations! Your Admission to {{university}} is Confirmed',
  '<p>Dear {{student_name}},</p><p>Congratulations! We are delighted to inform you that your admission to <strong>{{course}}</strong> at <strong>{{university}}</strong> has been officially confirmed.</p><p>Your admission number is: <strong>{{admission_number}}</strong></p><p>Your counselor {{counselor}} will contact you shortly with next steps.</p><p>Welcome to the Edvix family!</p>',
  '["student_name", "course", "university", "admission_number", "counselor"]'
),
(
  'LMS Credentials', 'LMS Credentials',
  'Your LMS Login Credentials for {{university}}',
  '<p>Dear {{student_name}},</p><p>Your Learning Management System (LMS) account has been created for <strong>{{university}}</strong>.</p><p>Please login at your university portal and change your password on first login.</p><p>If you face any issues, please contact your counselor {{counselor}}.</p>',
  '["student_name", "university", "counselor"]'
),
(
  'Scholarship Offer', 'Scholarship Offer',
  'Exclusive Scholarship Offer for {{course}} — Act Fast!',
  '<p>Dear {{student_name}},</p><p>Great news! Based on your profile, you are eligible for a scholarship on the <strong>{{course}}</strong> program.</p><p>This offer is valid for a limited time. Please contact your counselor {{counselor}} to avail this opportunity.</p>',
  '["student_name", "course", "counselor"]'
),
(
  'Admission Update', 'Admission Update',
  'Update on Your Admission Status — {{university}}',
  '<p>Dear {{student_name}},</p><p>We would like to provide you with an update on your admission process for <strong>{{course}}</strong> at <strong>{{university}}</strong>.</p><p>Please reach out to your counselor {{counselor}} for more details or to take the next steps.</p>',
  '["student_name", "course", "university", "counselor"]'
),
(
  'Custom Email', 'Custom',
  '{{subject}}',
  '<p>{{body}}</p>',
  '["subject", "body"]'
);

--------------------------------------------------
-- 3. EMAIL MESSAGES
--------------------------------------------------
CREATE TABLE public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    campaign_id UUID,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    subject TEXT NOT NULL,
    body TEXT NOT NULL,          -- HTML body
    snippet TEXT,
    
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    cc JSONB DEFAULT '[]'::jsonb,
    bcc JSONB DEFAULT '[]'::jsonb,
    
    folder VARCHAR(50) DEFAULT 'Sent' CHECK (folder IN ('Inbox', 'Sent', 'Drafts', 'Scheduled', 'Archived', 'Trash')),
    status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam')),
    
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    tracking_enabled BOOLEAN DEFAULT TRUE,
    thread_id TEXT,
    
    provider_message_id TEXT,
    scheduled_for TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add campaign_id column after campaigns table creation below (circular dep workaround)
-- The FK will be added after

CREATE INDEX idx_email_messages_lead ON public.email_messages(lead_id);
CREATE INDEX idx_email_messages_folder ON public.email_messages(folder);
CREATE INDEX idx_email_messages_status ON public.email_messages(status);
CREATE INDEX idx_email_messages_created ON public.email_messages(created_at DESC);

--------------------------------------------------
-- 4. EMAIL CAMPAIGNS (Bulk sends)
--------------------------------------------------
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    audience_filters JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
    scheduled_for TIMESTAMPTZ,
    total_targeted INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now add the FK from email_messages to email_campaigns
ALTER TABLE public.email_messages
    ADD CONSTRAINT fk_email_messages_campaign 
    FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

--------------------------------------------------
-- 5. EMAIL ATTACHMENTS
--------------------------------------------------
CREATE TABLE public.email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size VARCHAR(50),
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_attachments_msg ON public.email_attachments(message_id);

--------------------------------------------------
-- 6. EMAIL DELIVERY LOGS
--------------------------------------------------
CREATE TABLE public.email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam')),
    provider_event_id TEXT,
    provider_response JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_delivery_logs_msg ON public.email_delivery_logs(message_id);
CREATE INDEX idx_email_delivery_logs_event ON public.email_delivery_logs(event_type);

--------------------------------------------------
-- 7. ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Templates: all authenticated users
CREATE POLICY "Authenticated users can view email templates"
    ON public.email_templates FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Accounts: admins only
CREATE POLICY "Admins manage email accounts"
    ON public.email_accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Messages: all authenticated (read/insert/update)
CREATE POLICY "Authenticated users can view emails"
    ON public.email_messages FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert emails"
    ON public.email_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update emails"
    ON public.email_messages FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Campaigns: admins only
CREATE POLICY "Admins manage email campaigns"
    ON public.email_campaigns FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Attachments: all authenticated
CREATE POLICY "Authenticated users can manage attachments"
    ON public.email_attachments FOR ALL
    USING (auth.uid() IS NOT NULL);

-- Delivery logs: insert for all, select for admins
CREATE POLICY "Anyone can insert delivery logs"
    ON public.email_delivery_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view delivery logs"
    ON public.email_delivery_logs FOR SELECT
    USING (auth.uid() IS NOT NULL);

--------------------------------------------------
-- 8. TRIGGERS
--------------------------------------------------
CREATE TRIGGER set_email_accounts_updated_at
    BEFORE UPDATE ON public.email_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_email_messages_updated_at
    BEFORE UPDATE ON public.email_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_email_campaigns_updated_at
    BEFORE UPDATE ON public.email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
