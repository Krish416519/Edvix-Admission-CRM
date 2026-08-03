-- 00000000000000_initial_schema.sql
-- Edvix CRM Initial Database Schema
-- Defines normalized tables, UUIDs, timestamps, constraints, and indexes.
-- No RLS policies enabled yet (as per request).

--------------------------------------------------
-- 1. UTILITY FUNCTIONS
--------------------------------------------------

-- Function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------
-- 2. AUTH & ACCESS CONTROL
--------------------------------------------------

-- Roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (action, resource)
);

-- Role Permissions (Bridge)
CREATE TABLE public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users (Extends Supabase native auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 3. MASTER DATA
--------------------------------------------------

-- Universities
CREATE TABLE public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    level VARCHAR(100) NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, university_id)
);

--------------------------------------------------
-- 4. CRM CORE (LEADS & ACTIVITIES)
--------------------------------------------------

-- Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    state VARCHAR(100),
    city VARCHAR(100),
    budget VARCHAR(100),
    source VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'New',
    priority VARCHAR(50) NOT NULL DEFAULT 'Low',
    score INTEGER NOT NULL DEFAULT 0,
    
    -- Relationships
    counselor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    
    -- AI Fields
    ai_score INTEGER,
    ai_insights TEXT,
    ai_suggested_next_action TEXT,
    ai_summary TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead Activities
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    subject VARCHAR(255),
    duration VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    date TIMESTAMPTZ,
    author VARCHAR(255),
    status VARCHAR(100),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    due_date DATE NOT NULL,
    due_time TIME,
    reminder_time TIME,
    recurring VARCHAR(50) DEFAULT 'None',
    notes TEXT,

    assigned_to_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 5. ADMISSIONS & FINANCE
--------------------------------------------------

-- Admissions
CREATE TABLE public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID UNIQUE REFERENCES public.leads(id) ON DELETE SET NULL,
    student_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
    
    stage VARCHAR(100) NOT NULL,
    abc_id VARCHAR(100),
    deb_id VARCHAR(100),
    enrollment_number VARCHAR(100),
    
    intake VARCHAR(50),
    academic_session VARCHAR(50),
    counselor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    counselor_name VARCHAR(255),
    expected_completion_date DATE,
    progress INTEGER DEFAULT 0,
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    url TEXT,
    size VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure document is linked to either lead or admission
    CHECK (lead_id IS NOT NULL OR admission_id IS NOT NULL)
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    
    payment_type VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gst NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    scholarship NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    payment_date TIMESTAMPTZ,
    payment_mode VARCHAR(100),
    transaction_id VARCHAR(255),
    receipt_url TEXT,
    remarks TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    invoice_id VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 6. SYSTEM LOGS & NOTIFICATIONS
--------------------------------------------------

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automation Logs
CREATE TABLE public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID,
    workflow_name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    affected_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    execution_time_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Logs
CREATE TABLE public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_preview TEXT,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 7. TRIGGERS
--------------------------------------------------

CREATE TRIGGER set_updated_at_roles BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_permissions BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_universities BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_courses BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_lead_activities BEFORE UPDATE ON public.lead_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_notes BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_admissions BEFORE UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_automation_logs BEFORE UPDATE ON public.automation_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_ai_logs BEFORE UPDATE ON public.ai_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------
-- 8. INDEXES (PERFORMANCE OPTIMIZATION)
--------------------------------------------------

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role_id ON public.users(role_id);

CREATE INDEX idx_leads_counselor_id ON public.leads(counselor_id);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_university_id ON public.leads(university_id);

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_date ON public.lead_activities(date);

CREATE INDEX idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);
CREATE INDEX idx_tasks_lead_id ON public.tasks(lead_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

CREATE INDEX idx_notes_lead_id ON public.notes(lead_id);

CREATE INDEX idx_admissions_lead_id ON public.admissions(lead_id);
CREATE INDEX idx_admissions_counselor_id ON public.admissions(counselor_id);
CREATE INDEX idx_admissions_stage ON public.admissions(stage);
CREATE INDEX idx_admissions_university_id ON public.admissions(university_id);

CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX idx_documents_admission_id ON public.documents(admission_id);

CREATE INDEX idx_payments_admission_id ON public.payments(admission_id);
CREATE INDEX idx_payments_status ON public.payments(status);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
