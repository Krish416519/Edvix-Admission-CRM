-- ==============================================================================
-- EDVIX CRM — STEP 38: STUDENT SUCCESS & LIFECYCLE MANAGEMENT
-- ==============================================================================

-- ─── 1. ROLES ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Get any existing organization_id to satisfy NOT NULL (shared global roles)
    BEGIN
        SELECT id INTO org_id FROM public.organizations LIMIT 1;
    EXCEPTION WHEN undefined_table THEN
        org_id := NULL;
    END;

    IF org_id IS NOT NULL THEN
        INSERT INTO public.roles (name, organization_id) VALUES
        ('Student Success Executive', org_id)
        ON CONFLICT (name) DO NOTHING;
    ELSE
        INSERT INTO public.roles (name) VALUES
        ('Student Success Executive')
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;


-- ─── 2. UNIVERSITY ENROLLMENT RULES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_enrollment_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id       UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    program_id          UUID REFERENCES public.courses(id) ON DELETE CASCADE, -- Optional, if rules differ by program
    checklist_template  JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings/objects
    milestone_template  JSONB NOT NULL DEFAULT '[]'::jsonb,
    sla_config          JSONB NOT NULL DEFAULT '{"first_response_hours": 24, "resolution_hours": 72}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enrollment_rules_univ ON public.university_enrollment_rules(university_id);

CREATE TRIGGER set_updated_at_university_enrollment_rules
    BEFORE UPDATE ON public.university_enrollment_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 3. STUDENT ENROLLMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id        UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    
    -- Status
    enrollment_status   VARCHAR(100) NOT NULL DEFAULT 'Admission Confirmed',
    health_score        INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    risk_level          VARCHAR(50) NOT NULL DEFAULT 'Low Risk'
                        CHECK (risk_level IN ('Low Risk', 'Medium Risk', 'High Risk', 'Critical')),
    
    -- IDs & Access
    student_id_number   VARCHAR(100),
    university_registration_id VARCHAR(100),
    lms_status          VARCHAR(50) DEFAULT 'Pending',
    lms_access_requested_at TIMESTAMPTZ,
    lms_access_activated_at TIMESTAMPTZ,
    
    -- Orientation
    orientation_status  VARCHAR(50) DEFAULT 'Pending',
    orientation_date    TIMESTAMPTZ,
    
    -- Engagement & Assignment
    success_executive_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    last_engagement_date TIMESTAMPTZ DEFAULT NOW(),
    next_action_recommendation TEXT,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_student_enrollments_admission ON public.student_enrollments(admission_id);
CREATE INDEX idx_student_enrollments_exec ON public.student_enrollments(success_executive_id);
CREATE INDEX idx_student_enrollments_status ON public.student_enrollments(enrollment_status);

CREATE TRIGGER set_updated_at_student_enrollments
    BEFORE UPDATE ON public.student_enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 4. ENROLLMENT CHECKLISTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollment_checklists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id       UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
    item_name           VARCHAR(255) NOT NULL,
    is_completed        BOOLEAN NOT NULL DEFAULT false,
    completed_at        TIMESTAMPTZ,
    completed_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enrollment_checklists_enrollment ON public.enrollment_checklists(enrollment_id);

CREATE TRIGGER set_updated_at_enrollment_checklists
    BEFORE UPDATE ON public.enrollment_checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 5. STUDENT SUPPORT TICKETS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_support_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number       VARCHAR(30) UNIQUE NOT NULL DEFAULT '',
    enrollment_id       UUID NOT NULL REFERENCES public.student_enrollments(id) ON DELETE CASCADE,
    subject             VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    category            VARCHAR(100) NOT NULL DEFAULT 'General Support',
    priority            VARCHAR(50) NOT NULL DEFAULT 'Normal'
                        CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    status              VARCHAR(50) NOT NULL DEFAULT 'Open'
                        CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Waiting for Student', 'Waiting for University', 'Resolved', 'Closed', 'Escalated')),
    assigned_to         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reported_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_student_tickets_enrollment ON public.student_support_tickets(enrollment_id);
CREATE INDEX idx_student_tickets_assigned ON public.student_support_tickets(assigned_to);

-- Generate Ticket Number
CREATE OR REPLACE FUNCTION public.generate_student_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_val INT;
BEGIN
    SELECT nextval('ticket_number_seq') INTO seq_val;
    NEW.ticket_number := 'ST-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(seq_val::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_student_ticket_number
    BEFORE INSERT ON public.student_support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_number = '' OR NEW.ticket_number IS NULL)
    EXECUTE FUNCTION public.generate_student_ticket_number();

CREATE TRIGGER set_updated_at_student_support_tickets
    BEFORE UPDATE ON public.student_support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 6. STUDENT SUPPORT MESSAGES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_support_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id           UUID NOT NULL REFERENCES public.student_support_tickets(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message             TEXT NOT NULL,
    is_internal         BOOLEAN NOT NULL DEFAULT false, -- If true, not visible to students/partners
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_student_support_messages_ticket ON public.student_support_messages(ticket_id);

CREATE TRIGGER set_updated_at_student_support_messages
    BEFORE UPDATE ON public.student_support_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 7. ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────

ALTER TABLE public.university_enrollment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_support_messages ENABLE ROW LEVEL SECURITY;

-- Admins/Super Admins and Managers have full access
CREATE POLICY "Full access university_enrollment_rules" ON public.university_enrollment_rules FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Manager'));
CREATE POLICY "Full access student_enrollments" ON public.student_enrollments FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Student Success Executive', 'University Operations Manager', 'University Operations Executive', 'Team Leader', 'Counselor'));
CREATE POLICY "Full access enrollment_checklists" ON public.enrollment_checklists FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Student Success Executive', 'University Operations Manager', 'University Operations Executive', 'Team Leader', 'Counselor'));
CREATE POLICY "Full access student_support_tickets" ON public.student_support_tickets FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Student Success Executive', 'University Operations Manager', 'University Operations Executive', 'Team Leader', 'Counselor', 'Support'));
CREATE POLICY "Full access student_support_messages" ON public.student_support_messages FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Student Success Executive', 'University Operations Manager', 'University Operations Executive', 'Team Leader', 'Counselor', 'Support'));

-- Partners can only view enrollments tied to their admissions
CREATE POLICY "Partners view their student enrollments" ON public.student_enrollments
    FOR SELECT USING (
        public.user_role() = 'Partner' 
        AND admission_id IN (
            SELECT a.id FROM public.admissions a
            JOIN public.leads l ON a.lead_id = l.id
            WHERE l.partner_id = auth.uid()
        )
    );

-- Partners can view non-internal support tickets for their students
CREATE POLICY "Partners view their student support tickets" ON public.student_support_tickets
    FOR SELECT USING (
        public.user_role() = 'Partner'
        AND enrollment_id IN (
            SELECT e.id FROM public.student_enrollments e
            JOIN public.admissions a ON e.admission_id = a.id
            JOIN public.leads l ON a.lead_id = l.id
            WHERE l.partner_id = auth.uid()
        )
    );

CREATE POLICY "Partners view non-internal messages" ON public.student_support_messages
    FOR SELECT USING (
        public.user_role() = 'Partner'
        AND is_internal = false
        AND ticket_id IN (
            SELECT t.id FROM public.student_support_tickets t
            JOIN public.student_enrollments e ON t.enrollment_id = e.id
            JOIN public.admissions a ON e.admission_id = a.id
            JOIN public.leads l ON a.lead_id = l.id
            WHERE l.partner_id = auth.uid()
        )
    );

-- Universities can view enrollments for their university
CREATE POLICY "Universities view their enrollments" ON public.student_enrollments
    FOR SELECT USING (
        public.user_role() = 'University'
        AND admission_id IN (
            SELECT id FROM public.admissions WHERE university_id = auth.uid()
        )
    );

-- REALTIME PUBLICATIONS
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollment_checklists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_support_messages;
