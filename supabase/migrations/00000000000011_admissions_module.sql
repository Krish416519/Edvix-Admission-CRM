-- =============================================================================
-- 00000000000011_admissions_module.sql
-- Production-ready Admissions Management Module for Edvix AI CRM
-- =============================================================================

--------------------------------------------------
-- STEP 1: DROP OLD ADMISSIONS TABLE & RECREATE
-- This replaces the old simple table with the full enterprise schema.
-- The documents table references admissions, so we must handle it safely.
--------------------------------------------------

-- Temporarily drop FK from documents referencing old admissions
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_admission_id_fkey;
-- Drop tasks FK to admissions
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_admission_id_fkey;
-- Drop payments FK to admissions (finance module)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_admission_id_fkey;

-- Drop old RLS policies on admissions before dropping the table
DROP POLICY IF EXISTS "Admins full access admissions" ON public.admissions;
DROP POLICY IF EXISTS "Counselors view/edit own admissions" ON public.admissions;
DROP POLICY IF EXISTS "Accounts view all admissions" ON public.admissions;

-- Drop the old simple admissions table
DROP TABLE IF EXISTS public.admissions CASCADE;

--------------------------------------------------
-- STEP 2: SEQUENCE FOR AUTO-GENERATING ADMISSION NUMBERS
-- Format: ADM-2026-000001
--------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.admission_number_seq START 1;

--------------------------------------------------
-- STEP 3: CORE ADMISSIONS TABLE
--------------------------------------------------
CREATE TABLE public.admissions (
    -- Identity
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_number        VARCHAR(30) UNIQUE NOT NULL DEFAULT '',

    -- Relationships
    lead_id                 UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    university_id           UUID REFERENCES public.universities(id) ON DELETE SET NULL,
    course_id               UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    assigned_counselor      UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- Student Information (snapshot at time of admission)
    student_name            VARCHAR(255) NOT NULL,
    email                   VARCHAR(255),
    phone                   VARCHAR(50),
    specialization          VARCHAR(255),

    -- Program Details
    intake                  VARCHAR(50),                    -- e.g. 'Jan 2026', 'Jul 2026'
    academic_session        VARCHAR(50),                    -- e.g. '2025-2026'

    -- Status & Stage
    admission_status        VARCHAR(50) NOT NULL DEFAULT 'Active'
                            CHECK (admission_status IN ('Active', 'Cancelled', 'Completed', 'On Hold')),
    current_stage           VARCHAR(100) NOT NULL DEFAULT 'Inquiry',

    -- Application Details
    application_number      VARCHAR(100),
    university_enrollment_number VARCHAR(100),
    abc_id                  VARCHAR(100),
    deb_id                  VARCHAR(100),

    -- Finance
    fee_structure           NUMERIC(12, 2) DEFAULT 0,
    scholarship_amount      NUMERIC(12, 2) DEFAULT 0,
    discount                NUMERIC(12, 2) DEFAULT 0,
    expected_revenue        NUMERIC(12, 2) GENERATED ALWAYS AS (
                                GREATEST(fee_structure - scholarship_amount - discount, 0)
                            ) STORED,

    -- Dates
    registration_date       DATE,
    admission_date          DATE,
    enrollment_date         DATE,

    -- General
    remarks                 TEXT,
    progress                INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

    -- Audit
    created_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ DEFAULT NULL
);

-- Auto-generate admission_number via trigger
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.admission_number := 'ADM-' || EXTRACT(YEAR FROM NOW())::TEXT
                            || '-' || LPAD(nextval('public.admission_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_admission_number
    BEFORE INSERT ON public.admissions
    FOR EACH ROW
    WHEN (NEW.admission_number = '' OR NEW.admission_number IS NULL)
    EXECUTE FUNCTION public.generate_admission_number();

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_admissions
    BEFORE UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 4: ADMISSION STAGE HISTORY TABLE
-- Tracks every stage transition with full audit trail
--------------------------------------------------
CREATE TABLE public.admission_stage_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    previous_stage  VARCHAR(100),
    new_stage       VARCHAR(100) NOT NULL,
    changed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    remarks         TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- STEP 5: ADMISSION NOTES TABLE
--------------------------------------------------
CREATE TABLE public.admission_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    author_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name     VARCHAR(255),
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_admission_notes
    BEFORE UPDATE ON public.admission_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 6: ADMISSION TAGS TABLE
--------------------------------------------------
CREATE TABLE public.admission_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    tag             VARCHAR(100) NOT NULL,
    created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (admission_id, tag)
);

--------------------------------------------------
-- STEP 7: RESTORE FOREIGN KEYS TO CHILD TABLES
-- First nullify any orphaned references from old/mock data
--------------------------------------------------

-- Nullify orphaned admission_id in documents (references that no longer exist)
UPDATE public.documents
SET admission_id = NULL
WHERE admission_id IS NOT NULL
  AND admission_id NOT IN (SELECT id FROM public.admissions);

-- Nullify orphaned admission_id in payments (references that no longer exist)
UPDATE public.payments
SET admission_id = NULL
WHERE admission_id IS NOT NULL
  AND admission_id NOT IN (SELECT id FROM public.admissions);

ALTER TABLE public.documents
    ADD CONSTRAINT documents_admission_id_fkey
    FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_admission_id_fkey
    FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE SET NULL;

-- Re-add tasks FK to admissions (if tasks table has the column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='admission_id') THEN
        ALTER TABLE public.tasks
            ADD CONSTRAINT tasks_admission_id_fkey
            FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE SET NULL;
    END IF;
END $$;

--------------------------------------------------
-- STEP 8: TRIGGER — Log Stage Changes Automatically
-- Inserts into admission_stage_history AND lead_activities on stage change
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_admission_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Only fire if the stage actually changed
    IF OLD.current_stage IS NOT DISTINCT FROM NEW.current_stage THEN
        RETURN NEW;
    END IF;

    -- Get the name of the user making the change
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();

    -- Insert stage history record
    INSERT INTO public.admission_stage_history (
        admission_id, previous_stage, new_stage, changed_by, changed_by_name, changed_at
    ) VALUES (
        NEW.id,
        OLD.current_stage,
        NEW.current_stage,
        auth.uid(),
        COALESCE(v_user_name, 'System'),
        NOW()
    );

    -- Log to lead_activities if linked to a lead
    IF NEW.lead_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.lead_activities (lead_id, type, content, author)
            VALUES (
                NEW.lead_id,
                'Admission Stage Updated',
                'Admission ' || NEW.admission_number || ' stage changed from "' || OLD.current_stage || '" to "' || NEW.current_stage || '".',
                COALESCE(v_user_name, 'System')
            );
        EXCEPTION WHEN OTHERS THEN
            -- Silently skip if lead_activities insert fails
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_admission_stage_change
    AFTER UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admission_stage_change();

--------------------------------------------------
-- STEP 9: TRIGGER — Log Admission Creation
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_admission_created()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();

    -- Log initial stage in history
    INSERT INTO public.admission_stage_history (
        admission_id, previous_stage, new_stage, changed_by, changed_by_name, changed_at
    ) VALUES (
        NEW.id,
        NULL,
        NEW.current_stage,
        auth.uid(),
        COALESCE(v_user_name, 'System'),
        NOW()
    );

    -- Log to lead_activities
    IF NEW.lead_id IS NOT NULL THEN
        BEGIN
            INSERT INTO public.lead_activities (lead_id, type, content, author)
            VALUES (
                NEW.lead_id,
                'Admission Created',
                'Admission ' || NEW.admission_number || ' created for ' || NEW.student_name || '.',
                COALESCE(v_user_name, 'System')
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_admission_created
    AFTER INSERT ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_admission_created();

--------------------------------------------------
-- STEP 10: TRIGGER — Update lead's admission_status field on stage change
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_lead_admission_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lead_id IS NOT NULL AND NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
        UPDATE public.leads
        SET admission_status = NEW.admission_status,
            updated_at = NOW()
        WHERE id = NEW.lead_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_lead_admission_status
    AFTER UPDATE ON public.admissions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_lead_admission_status();

--------------------------------------------------
-- STEP 11: PERFORMANCE INDEXES
--------------------------------------------------
CREATE INDEX idx_admissions_lead_id        ON public.admissions(lead_id);
CREATE INDEX idx_admissions_counselor      ON public.admissions(assigned_counselor);
CREATE INDEX idx_admissions_university     ON public.admissions(university_id);
CREATE INDEX idx_admissions_course         ON public.admissions(course_id);
CREATE INDEX idx_admissions_stage          ON public.admissions(current_stage);
CREATE INDEX idx_admissions_status         ON public.admissions(admission_status);
CREATE INDEX idx_admissions_number         ON public.admissions(admission_number);
CREATE INDEX idx_admissions_deleted_at     ON public.admissions(deleted_at);
CREATE INDEX idx_admissions_created_at     ON public.admissions(created_at DESC);

CREATE INDEX idx_adm_stage_history_adm_id  ON public.admission_stage_history(admission_id);
CREATE INDEX idx_adm_stage_history_at      ON public.admission_stage_history(changed_at DESC);

CREATE INDEX idx_adm_notes_adm_id          ON public.admission_notes(admission_id);
CREATE INDEX idx_adm_tags_adm_id           ON public.admission_tags(admission_id);

--------------------------------------------------
-- STEP 12: ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.admissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_tags        ENABLE ROW LEVEL SECURITY;

-- *** ADMISSIONS POLICIES ***

-- Super Admin & Admin: Full access
CREATE POLICY "Admins full access admissions"
ON public.admissions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Counselor: Only their assigned admissions
CREATE POLICY "Counselors access assigned admissions"
ON public.admissions FOR ALL TO authenticated
USING (
    public.user_role() = 'Counselor' AND assigned_counselor = auth.uid()
)
WITH CHECK (
    public.user_role() = 'Counselor' AND assigned_counselor = auth.uid()
);

-- Accounts: Read-only access to all (for finance)
CREATE POLICY "Accounts read all admissions"
ON public.admissions FOR SELECT TO authenticated
USING (public.user_role() = 'Accounts');

-- *** STAGE HISTORY POLICIES ***

CREATE POLICY "Admins full access stage history"
ON public.admission_stage_history FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can view history for their admissions"
ON public.admission_stage_history FOR SELECT TO authenticated
USING (
    admission_id IN (
        SELECT id FROM public.admissions WHERE assigned_counselor = auth.uid()
    )
);

-- *** NOTES POLICIES ***

CREATE POLICY "Admins full access admission notes"
ON public.admission_notes FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can manage notes for assigned admissions"
ON public.admission_notes FOR ALL TO authenticated
USING (
    admission_id IN (
        SELECT id FROM public.admissions WHERE assigned_counselor = auth.uid()
    )
)
WITH CHECK (
    admission_id IN (
        SELECT id FROM public.admissions WHERE assigned_counselor = auth.uid()
    )
);

-- *** TAGS POLICIES ***

CREATE POLICY "Admins full access tags"
ON public.admission_tags FOR ALL TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can manage tags for assigned admissions"
ON public.admission_tags FOR ALL TO authenticated
USING (
    admission_id IN (
        SELECT id FROM public.admissions WHERE assigned_counselor = auth.uid()
    )
);

--------------------------------------------------
-- STEP 13: GRANT PERMISSIONS TO TRIGGERS
--------------------------------------------------
GRANT INSERT ON public.admission_stage_history TO postgres;
GRANT INSERT ON public.admission_stage_history TO service_role;
GRANT INSERT ON public.lead_activities TO postgres;
GRANT INSERT ON public.lead_activities TO service_role;
GRANT UPDATE ON public.leads TO postgres;
GRANT UPDATE ON public.leads TO service_role;

-- Grant full access to admissions for triggers
GRANT ALL ON public.admissions TO postgres;
GRANT ALL ON public.admissions TO service_role;

-- Grant sequence access
GRANT USAGE, SELECT ON SEQUENCE public.admission_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.admission_number_seq TO postgres;
GRANT USAGE, SELECT ON SEQUENCE public.admission_number_seq TO service_role;

-- Enable Supabase Realtime on the admissions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admission_stage_history;
