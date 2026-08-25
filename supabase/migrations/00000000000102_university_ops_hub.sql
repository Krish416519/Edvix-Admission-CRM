-- =============================================================================
-- 00000000000102_university_ops_hub.sql
-- Step 37: University Integration & Admission Operations Hub
-- Extends existing tables. Does NOT recreate universities, courses, admissions.
-- =============================================================================

-- ─── 1. EXTEND public.universities ───────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='brand_name') THEN
    ALTER TABLE public.universities ADD COLUMN brand_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='official_name') THEN
    ALTER TABLE public.universities ADD COLUMN official_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='university_type') THEN
    ALTER TABLE public.universities ADD COLUMN university_type VARCHAR(100) DEFAULT 'Private';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='recognition_info') THEN
    ALTER TABLE public.universities ADD COLUMN recognition_info TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='website') THEN
    ALTER TABLE public.universities ADD COLUMN website TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='support_email') THEN
    ALTER TABLE public.universities ADD COLUMN support_email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='admission_email') THEN
    ALTER TABLE public.universities ADD COLUMN admission_email VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='application_url') THEN
    ALTER TABLE public.universities ADD COLUMN application_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='application_method') THEN
    ALTER TABLE public.universities ADD COLUMN application_method VARCHAR(100) DEFAULT 'Manual Portal'
      CHECK (application_method IN ('Manual Portal','University API','Email','Webhook','Partner Portal','Internal Processing','Other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='partner_status') THEN
    ALTER TABLE public.universities ADD COLUMN partner_status VARCHAR(50) DEFAULT 'Active'
      CHECK (partner_status IN ('Active','Inactive','Suspended','Pending'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='internal_notes') THEN
    ALTER TABLE public.universities ADD COLUMN internal_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='address_line1') THEN
    ALTER TABLE public.universities ADD COLUMN address_line1 TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='address_city') THEN
    ALTER TABLE public.universities ADD COLUMN address_city VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='address_state') THEN
    ALTER TABLE public.universities ADD COLUMN address_state VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='address_pincode') THEN
    ALTER TABLE public.universities ADD COLUMN address_pincode VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='universities' AND column_name='organization_id') THEN
    ALTER TABLE public.universities ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 2. EXTEND public.courses ─────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='degree_type') THEN
    ALTER TABLE public.courses ADD COLUMN degree_type VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='specialization') THEN
    ALTER TABLE public.courses ADD COLUMN specialization VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='mode') THEN
    ALTER TABLE public.courses ADD COLUMN mode VARCHAR(50) DEFAULT 'Online'
      CHECK (mode IN ('Online','Offline','Hybrid','Distance'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='duration_months') THEN
    ALTER TABLE public.courses ADD COLUMN duration_months INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='eligibility') THEN
    ALTER TABLE public.courses ADD COLUMN eligibility TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='application_fee') THEN
    ALTER TABLE public.courses ADD COLUMN application_fee NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='intake_months') THEN
    ALTER TABLE public.courses ADD COLUMN intake_months TEXT; -- e.g. 'Jan,Jul'
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='application_deadline') THEN
    ALTER TABLE public.courses ADD COLUMN application_deadline DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='admission_deadline') THEN
    ALTER TABLE public.courses ADD COLUMN admission_deadline DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='documents_required') THEN
    ALTER TABLE public.courses ADD COLUMN documents_required JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='commission_rules') THEN
    ALTER TABLE public.courses ADD COLUMN commission_rules JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='payout_rules') THEN
    ALTER TABLE public.courses ADD COLUMN payout_rules JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='effective_date') THEN
    ALTER TABLE public.courses ADD COLUMN effective_date DATE;
  END IF;
END $$;

-- ─── 3. UNIVERSITY CONTACTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  department      VARCHAR(100),
  role            VARCHAR(100),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  program_id      UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  region          VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes  TEXT,  -- never exposed externally
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uni_contacts_university ON public.university_contacts(university_id);

-- ─── 4. UNIVERSITY SLAs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_slas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID REFERENCES public.universities(id) ON DELETE CASCADE, -- NULL = global default
  event_type      VARCHAR(100) NOT NULL, -- 'acknowledgement','document_verification','admission_decision','university_response'
  sla_hours       INTEGER NOT NULL DEFAULT 24,
  escalation_levels JSONB DEFAULT '[]', -- [{level:1, notify:["counselor","tl"], after_hours:2}]
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, event_type)
);
CREATE INDEX IF NOT EXISTS idx_uni_slas_university ON public.university_slas(university_id, event_type);

-- ─── 5. UNIVERSITY SUBMISSIONS (IDEMPOTENT QUEUE) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Idempotency: one submission per admission+university+course
  idempotency_key   VARCHAR(255) UNIQUE NOT NULL, -- SHA of admission_id+university_id+course_id
  admission_id      UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  university_id     UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  course_id         UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  -- People
  counselor_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Submission details
  submission_method VARCHAR(100) DEFAULT 'Manual Portal'
    CHECK (submission_method IN ('Manual Portal','University API','Email','Webhook','Partner Portal','Internal Processing','Other')),
  status            VARCHAR(100) NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Ready','Submitted','Received','Under Review','Additional Information Required',
                      'Conditional Approval','Approved','Rejected','Waitlisted','Deferred','Withdrawn','Cancelled')),
  readiness_score   INTEGER DEFAULT 0,
  -- Dates & SLA
  deadline          DATE,
  submitted_at      TIMESTAMPTZ,
  acknowledged_at   TIMESTAMPTZ,
  decision_at       TIMESTAMPTZ,
  sla_due_at        TIMESTAMPTZ,
  sla_status        VARCHAR(50) DEFAULT 'On Time'
    CHECK (sla_status IN ('On Time','Due Soon','Overdue','Breached','Escalated')),
  -- Notes
  submission_notes  TEXT,
  internal_notes    TEXT,
  -- Soft delete
  deleted_at        TIMESTAMPTZ,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uni_submissions_status ON public.university_submissions(status, deadline);
CREATE INDEX IF NOT EXISTS idx_uni_submissions_university ON public.university_submissions(university_id);
CREATE INDEX IF NOT EXISTS idx_uni_submissions_admission ON public.university_submissions(admission_id);

-- ─── 6. SUBMISSION REFERENCES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_submission_references (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  ref_type        VARCHAR(100) NOT NULL, -- 'Application Number','Portal Reference','Email Reference','Ticket Number','API Reference'
  ref_value       VARCHAR(500) NOT NULL,
  source          VARCHAR(100),
  recorded_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_refs_submission ON public.university_submission_references(submission_id);

-- ─── 7. STATUS HISTORY (APPEND-ONLY AUDIT) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  previous_status VARCHAR(100),
  new_status      VARCHAR(100) NOT NULL,
  changed_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          VARCHAR(100) DEFAULT 'Manual', -- 'Manual','API','Webhook','Email','System'
  notes           TEXT,
  reference       VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS idx_status_history_submission ON public.university_status_history(submission_id);

-- ─── 8. UNIVERSITY RESPONSE INBOX ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID REFERENCES public.university_submissions(id) ON DELETE SET NULL,
  university_id   UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  source          VARCHAR(50) NOT NULL DEFAULT 'Manual'
    CHECK (source IN ('Email','API','Webhook','Manual','Portal')),
  response_type   VARCHAR(100), -- 'Decision','Query','AIR','Acknowledgement','Document Request','Other'
  subject         VARCHAR(500),
  body            TEXT,
  priority        VARCHAR(20) DEFAULT 'Normal'
    CHECK (priority IN ('Low','Normal','High','Urgent')),
  status          VARCHAR(50) DEFAULT 'Unread'
    CHECK (status IN ('Unread','Read','In Progress','Actioned','Closed')),
  owner_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  required_action TEXT,
  action_deadline DATE,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actioned_at     TIMESTAMPTZ,
  actioned_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uni_responses_university ON public.university_responses(university_id);
CREATE INDEX IF NOT EXISTS idx_uni_responses_status ON public.university_responses(status);

-- ─── 9. ADDITIONAL INFORMATION REQUESTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_info_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  university_id   UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  request_type    VARCHAR(100), -- 'Additional Documents','Clarification','Re-submission','Other'
  description     TEXT NOT NULL,
  required_documents JSONB DEFAULT '[]',
  owner_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  deadline        DATE,
  status          VARCHAR(50) DEFAULT 'Open'
    CHECK (status IN ('Open','In Progress','Submitted','Closed')),
  linked_task_id  UUID, -- references public.tasks(id) — set after task auto-creation
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_air_submission ON public.university_info_requests(submission_id);

-- ─── 10. UNIVERSITY QUERIES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID REFERENCES public.university_submissions(id) ON DELETE SET NULL,
  university_id   UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  question        TEXT NOT NULL,
  university_response TEXT,
  requested_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          VARCHAR(50) DEFAULT 'Open'
    CHECK (status IN ('Open','Awaiting Response','Responded','Closed')),
  due_date        DATE,
  attachments     JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 11. UNIVERSITY INTEGRATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL
    CHECK (integration_type IN ('REST API','Webhook','Email','SFTP','Portal','Manual')),
  api_base_url    TEXT,
  auth_method     VARCHAR(50), -- 'API Key','OAuth2','Basic','Bearer'
  -- Credentials stored as Vault secret references, NEVER plain text
  vault_secret_ref VARCHAR(500), -- reference to Supabase Vault secret
  webhook_url     TEXT,
  webhook_secret_ref VARCHAR(500), -- vault reference for webhook signing secret
  email_address   VARCHAR(255),
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  test_mode       BOOLEAN NOT NULL DEFAULT TRUE,
  config          JSONB DEFAULT '{}', -- non-secret integration config
  last_tested_at  TIMESTAMPTZ,
  last_test_result VARCHAR(50),
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_uni_integrations_university ON public.university_integrations(university_id);

-- ─── 12. INTEGRATION LOGS (RETRY SYSTEM) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.university_integration_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID REFERENCES public.university_integrations(id) ON DELETE CASCADE,
  submission_id   UUID REFERENCES public.university_submissions(id) ON DELETE SET NULL,
  operation       VARCHAR(100) NOT NULL, -- 'submit','status_check','document_upload','webhook_receive'
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  status          VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Success','Failed','Retrying','Manual Review','Abandoned')),
  error_code      VARCHAR(100), -- 'ConnectionFailed','AuthFailed','ValidationFailed','RateLimited','Timeout','Duplicate','Unknown'
  error_message   TEXT,
  request_body    JSONB,  -- sanitized, no secrets
  response_body   JSONB,
  next_retry_at   TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_int_logs_submission ON public.university_integration_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_int_logs_status ON public.university_integration_logs(status, next_retry_at);

-- ─── 13. ADMISSION DECISIONS (RBAC-GATED) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admission_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  decision        VARCHAR(100) NOT NULL
    CHECK (decision IN ('Approved','Conditionally Approved','Rejected','Waitlisted','Deferred','Withdrawn')),
  decision_date   DATE NOT NULL,
  source          VARCHAR(100), -- 'University Email','API','Portal','Manual'
  reference       VARCHAR(500),
  conditions      TEXT,
  notes           TEXT,
  recorded_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Every override must have an audit reason
  override_reason TEXT,
  overridden_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  overridden_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_decisions_submission ON public.admission_decisions(submission_id);
CREATE INDEX IF NOT EXISTS idx_decisions_admission ON public.admission_decisions(admission_id);

-- ─── 14. ADMISSION LETTERS (SECURE) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admission_letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  letter_type     VARCHAR(100) NOT NULL
    CHECK (letter_type IN ('Admission Letter','Offer Letter','Provisional Admission','Enrollment Letter','Other')),
  storage_path    TEXT NOT NULL, -- Supabase Storage path (never public)
  file_name       VARCHAR(500),
  file_size_bytes BIGINT,
  version         INTEGER NOT NULL DEFAULT 1,
  verification_status VARCHAR(50) NOT NULL DEFAULT 'Uploaded'
    CHECK (verification_status IN ('Uploaded','Under Review','Verified','Rejected','Needs Correction')),
  verified_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_latest       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_letters_submission ON public.admission_letters(submission_id);
CREATE INDEX IF NOT EXISTS idx_letters_admission ON public.admission_letters(admission_id);

-- ─── 15. ENROLLMENT MILESTONES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollment_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES public.university_submissions(id) ON DELETE CASCADE,
  admission_id    UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
  milestone_name  VARCHAR(255) NOT NULL,
  milestone_order INTEGER NOT NULL DEFAULT 1,
  status          VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','In Progress','Completed','Skipped')),
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enrollment_submission ON public.enrollment_milestones(submission_id);

-- ─── 16. RLS POLICIES ─────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE public.university_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_slas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_submission_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_info_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_queries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_integrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_decisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_letters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_milestones     ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is Admin or Super Admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('Super Admin','Admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get current user's role name
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT r.name FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- university_contacts: Admin/Super Admin full access, others read their org
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_contacts' AND policyname='uni_contacts_admin_full') THEN
    CREATE POLICY uni_contacts_admin_full ON public.university_contacts
      FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_contacts' AND policyname='uni_contacts_org_read') THEN
    CREATE POLICY uni_contacts_org_read ON public.university_contacts
      FOR SELECT USING (public.get_current_user_role() IN ('University Operations Manager','University Operations Executive','Counselor','Team Leader','Manager'));
  END IF;
END $$;

-- university_submissions: full access Admin+, counselors see own org
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_submissions' AND policyname='uni_sub_admin_full') THEN
    CREATE POLICY uni_sub_admin_full ON public.university_submissions
      FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_submissions' AND policyname='uni_sub_ops_access') THEN
    CREATE POLICY uni_sub_ops_access ON public.university_submissions
      FOR ALL USING (public.get_current_user_role() IN ('University Operations Manager','University Operations Executive','Manager','Team Leader')
        AND deleted_at IS NULL
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_submissions' AND policyname='uni_sub_counselor_own') THEN
    CREATE POLICY uni_sub_counselor_own ON public.university_submissions
      FOR SELECT USING (
        counselor_id = auth.uid()
        AND deleted_at IS NULL
      );
  END IF;
END $$;

-- admission_decisions: only Admin/Super Admin/UO Manager can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_decisions' AND policyname='decisions_admin_full') THEN
    CREATE POLICY decisions_admin_full ON public.admission_decisions
      FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_decisions' AND policyname='decisions_uom_write') THEN
    CREATE POLICY decisions_uom_write ON public.admission_decisions
      FOR ALL USING (public.get_current_user_role() = 'University Operations Manager'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_decisions' AND policyname='decisions_counselor_read') THEN
    CREATE POLICY decisions_counselor_read ON public.admission_decisions
      FOR SELECT USING (public.get_current_user_role() IN ('Counselor','Team Leader','Manager','University Operations Executive')
      );
  END IF;
END $$;

-- admission_letters: secure, never public
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_letters' AND policyname='letters_admin_full') THEN
    CREATE POLICY letters_admin_full ON public.admission_letters
      FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='admission_letters' AND policyname='letters_ops_access') THEN
    CREATE POLICY letters_ops_access ON public.admission_letters
      FOR ALL USING (public.get_current_user_role() IN ('University Operations Manager','University Operations Executive','Manager','Team Leader')
      );
  END IF;
END $$;

-- university_integrations: Admin only (credentials must never be exposed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_integrations' AND policyname='integrations_admin_only') THEN
    CREATE POLICY integrations_admin_only ON public.university_integrations
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

-- Remaining tables: org-scoped for ops roles
DO $$ BEGIN
  -- university_slas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_slas' AND policyname='slas_admin_full') THEN
    CREATE POLICY slas_admin_full ON public.university_slas FOR ALL USING (public.is_admin_or_super());
  END IF;
  -- status_history read-only for ops
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_status_history' AND policyname='sh_admin_full') THEN
    CREATE POLICY sh_admin_full ON public.university_status_history FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_status_history' AND policyname='sh_ops_read') THEN
    CREATE POLICY sh_ops_read ON public.university_status_history FOR SELECT USING (
      public.get_current_user_role() IN ('University Operations Manager','University Operations Executive','Manager','Team Leader','Counselor')
    );
  END IF;
  -- responses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_responses' AND policyname='responses_admin_full') THEN
    CREATE POLICY responses_admin_full ON public.university_responses FOR ALL USING (public.is_admin_or_super());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='university_responses' AND policyname='responses_ops_access') THEN
    CREATE POLICY responses_ops_access ON public.university_responses FOR ALL USING (public.get_current_user_role() IN ('University Operations Manager','University Operations Executive','Manager','Team Leader','Counselor')
    );
  END IF;
END $$;

-- ─── 17. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────
DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['university_contacts','university_slas','university_submissions',
    'university_info_requests','university_queries','university_integrations','enrollment_milestones'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%s ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ─── 18. STATUS HISTORY AUTO-TRIGGER ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_record_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.university_status_history
      (submission_id, previous_status, new_status, changed_by, source)
    VALUES
      (NEW.id, OLD.status, NEW.status, auth.uid(), 'System');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_submission_status_history ON public.university_submissions;
CREATE TRIGGER trg_submission_status_history
  AFTER UPDATE ON public.university_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_record_submission_status_change();

-- ─── 19. SEED DEFAULT SLA RULES ───────────────────────────────────────────────
INSERT INTO public.university_slas (university_id, event_type, sla_hours) VALUES
  (NULL, 'acknowledgement', 24),
  (NULL, 'document_verification', 48),
  (NULL, 'admission_decision', 120),
  (NULL, 'university_response', 24)
ON CONFLICT (university_id, event_type) DO NOTHING;
