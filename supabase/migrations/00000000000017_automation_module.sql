-- 00000000000017_automation_module.sql
-- Edvix AI CRM - Workflow Automation Engine Schema

DROP TABLE IF EXISTS public.automation_execution_logs CASCADE;
DROP TABLE IF EXISTS public.automation_runs CASCADE;
DROP TABLE IF EXISTS public.automation_actions CASCADE;
DROP TABLE IF EXISTS public.automation_conditions CASCADE;
DROP TABLE IF EXISTS public.automation_triggers CASCADE;
DROP TABLE IF EXISTS public.automation_templates CASCADE;
DROP TABLE IF EXISTS public.automation_workflows CASCADE;

--------------------------------------------------
-- 1. AUTOMATION WORKFLOWS
--------------------------------------------------
CREATE TABLE public.automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'draft', 'paused')),
    trigger_event VARCHAR(100) NOT NULL,
    trigger_metadata JSONB DEFAULT '{}'::jsonb,
    is_prebuilt BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 2. AUTOMATION TRIGGERS (Dictionary of available triggers)
--------------------------------------------------
CREATE TABLE public.automation_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Triggers
INSERT INTO public.automation_triggers (event_name, description) VALUES
('Lead Created', 'Fires when a new lead is added to the CRM'),
('Lead Updated', 'Fires when any lead information changes'),
('Lead Assigned', 'Fires when a lead is assigned to a counselor'),
('Lead Status Changed', 'Fires when a lead moves to a different stage'),
('Lead Score Changed', 'Fires when a lead AI score updates'),
('Task Created', 'Fires when a new task is created'),
('Task Completed', 'Fires when a task is marked as done'),
('Task Overdue', 'Fires when a task passes its deadline'),
('Admission Created', 'Fires when an admission process begins'),
('Admission Stage Changed', 'Fires when an admission changes stages'),
('Document Uploaded', 'Fires when a student uploads a doc'),
('Document Approved', 'Fires when admin approves a doc'),
('Document Rejected', 'Fires when admin rejects a doc'),
('Payment Received', 'Fires when a payment is marked as Paid'),
('Payment Pending', 'Fires when a payment is marked as Pending'),
('Invoice Generated', 'Fires when a new invoice is created'),
('Notification Created', 'Fires when a system notification triggers'),
('User Login', 'Fires when a user logs in'),
('Scheduled Time', 'Fires on a cron schedule'),
('Manual Trigger', 'Fired manually by a user via UI');

--------------------------------------------------
-- 3. AUTOMATION CONDITIONS
--------------------------------------------------
CREATE TABLE public.automation_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    value_text TEXT,
    logic VARCHAR(10) DEFAULT 'AND' CHECK (logic IN ('AND', 'OR')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_cond_workflow ON public.automation_conditions(workflow_id);

--------------------------------------------------
-- 4. AUTOMATION ACTIONS
--------------------------------------------------
CREATE TABLE public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_actions_workflow ON public.automation_actions(workflow_id);

--------------------------------------------------
-- 5. AUTOMATION RUNS (Active / Pending Executions)
--------------------------------------------------
CREATE TABLE public.automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    trigger_event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Failed', 'Delayed')),
    resume_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_runs_status ON public.automation_runs(status);

--------------------------------------------------
-- 6. AUTOMATION EXECUTION LOGS
--------------------------------------------------
CREATE TABLE public.automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
    trigger_event VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('Success', 'Failed', 'In Progress')),
    error_message TEXT,
    affected_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    actions_executed JSONB DEFAULT '[]'::jsonb,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auto_logs_workflow ON public.automation_execution_logs(workflow_id);
CREATE INDEX idx_auto_logs_created ON public.automation_execution_logs(created_at DESC);

--------------------------------------------------
-- 7. AUTOMATION TEMPLATES
--------------------------------------------------
CREATE TABLE public.automation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    definition JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Prebuilt Workflow Templates
INSERT INTO public.automation_templates (name, description, category, definition) VALUES
('Website Lead Routing', 'Assigns a counselor, creates a welcome task, and generates an AI Summary', 'Lead Management', '{"trigger": "Lead Created", "actions": [{"type": "Assign Counselor"}, {"type": "Create Task", "metadata": {"title": "Welcome Call"}}, {"type": "Send Notification"}, {"type": "Generate AI Summary"}]}'),
('Document Rejection Follow-up', 'Notifies counselor and drafts a WhatsApp message for the student', 'Admissions', '{"trigger": "Document Rejected", "actions": [{"type": "Send Notification"}, {"type": "Create Task", "metadata": {"title": "Follow up on rejected doc"}}, {"type": "Send WhatsApp"}]}'),
('Payment Pending Escalation', 'Reminds every 48 hours and escalates after 7 days', 'Finance', '{"trigger": "Payment Pending", "actions": [{"type": "Send Notification"}, {"type": "Delay Action", "metadata": {"hours": 48}}, {"type": "Send Notification", "metadata": {"is_escalation": true}}]}');

--------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS)
--------------------------------------------------
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view triggers and templates
CREATE POLICY "Anyone can view automation triggers" ON public.automation_triggers FOR SELECT USING (true);
CREATE POLICY "Anyone can view automation templates" ON public.automation_templates FOR SELECT USING (true);

-- Admins and Super Admins have full access to workflows, conditions, actions
CREATE POLICY "Admins manage workflows"
    ON public.automation_workflows
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

CREATE POLICY "Admins manage conditions"
    ON public.automation_conditions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

CREATE POLICY "Admins manage actions"
    ON public.automation_actions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

-- Counselors can view execution logs
CREATE POLICY "Users can view automation logs"
    ON public.automation_execution_logs
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert automation logs"
    ON public.automation_execution_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone can insert runs, admins can manage them
CREATE POLICY "Users can insert automation runs"
    ON public.automation_runs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view and manage runs"
    ON public.automation_runs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );
CREATE POLICY "Admins can update runs"
    ON public.automation_runs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Super Admin', 'Admin')
        )
    );

--------------------------------------------------
-- 9. TRIGGERS
--------------------------------------------------
CREATE TRIGGER set_automation_workflows_updated_at
    BEFORE UPDATE ON public.automation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_automation_runs_updated_at
    BEFORE UPDATE ON public.automation_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
