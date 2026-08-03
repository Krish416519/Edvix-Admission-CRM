-- 00000000000016_ai_module.sql
-- Edvix AI CRM - AI Memory and Auditing Schema

-- Drop existing tables if re-running
DROP TABLE IF EXISTS public.ai_audit_logs CASCADE;
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;

--------------------------------------------------
-- 1. AI CONVERSATIONS
--------------------------------------------------
CREATE TABLE public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    context_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);

--------------------------------------------------
-- 2. AI MESSAGES
--------------------------------------------------
CREATE TABLE public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'model', 'system', 'function')),
    content TEXT,
    tool_calls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering messages
CREATE INDEX idx_ai_messages_conv_created ON public.ai_messages(conversation_id, created_at ASC);

--------------------------------------------------
-- 3. AI AUDIT LOGS
--------------------------------------------------
CREATE TABLE public.ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    prompt TEXT,
    response TEXT,
    execution_time_ms INTEGER,
    tools_used JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_audit_logs_user ON public.ai_audit_logs(user_id);

--------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
--------------------------------------------------
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see their own. Admins/Super Admins see all.
CREATE POLICY "Users can manage their own AI conversations"
    ON public.ai_conversations
    FOR ALL
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Messages: Users can only see messages from their conversations.
CREATE POLICY "Users can manage their AI messages"
    ON public.ai_messages
    FOR ALL
    USING (
        conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Audit Logs: Only system can insert (handled by function/service role). Users cannot read them directly unless Admin.
CREATE POLICY "Admins can view AI audit logs"
    ON public.ai_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

CREATE POLICY "Anyone can insert AI audit logs"
    ON public.ai_audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

--------------------------------------------------
-- 5. TRIGGER FOR UPDATED_AT
--------------------------------------------------
CREATE TRIGGER set_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
