-- =============================================================================
-- 00000000000100_document_engine.sql
-- Step 36: Advanced Application & Document Processing Engine
-- =============================================================================

--------------------------------------------------
-- 1. DOCUMENT REQUIREMENTS TABLE
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    
    -- Configurability
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    multiple_allowed BOOLEAN NOT NULL DEFAULT false,
    max_file_size_kb INTEGER NOT NULL DEFAULT 5120, -- Default 5MB
    allowed_file_types VARCHAR(255) DEFAULT 'application/pdf,image/jpeg,image/png',
    validity_period_days INTEGER, -- Null means no expiration
    
    -- Scoping (If both null, applies to all applications)
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_doc_req
    BEFORE UPDATE ON public.document_requirements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_doc_req_uni ON public.document_requirements(university_id);
CREATE INDEX IF NOT EXISTS idx_doc_req_course ON public.document_requirements(course_id);

--------------------------------------------------
-- 2. DOCUMENT REJECTION REASONS TABLE
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_rejection_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard rejection reasons
INSERT INTO public.document_rejection_reasons (reason_code, description)
VALUES 
    ('BLURRY', 'Document is blurry or illegible.'),
    ('INCORRECT_DOC', 'Incorrect document uploaded.'),
    ('NAME_MISMATCH', 'Name on document does not match application.'),
    ('INCOMPLETE', 'Document is missing pages or incomplete.'),
    ('EXPIRED', 'Document has expired.'),
    ('WRONG_FORMAT', 'Document is not in an acceptable format.'),
    ('UNI_REQ_FAIL', 'Document does not meet university-specific requirements.'),
    ('OTHER', 'Other (See comments).')
ON CONFLICT (reason_code) DO NOTHING;

--------------------------------------------------
-- 3. EXTEND DOCUMENTS TABLE
--------------------------------------------------
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.document_requirements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejection_reason_id UUID REFERENCES public.document_rejection_reasons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS internal_note TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_req_id ON public.documents(requirement_id);

--------------------------------------------------
-- 4. EXTEND ADMISSIONS TABLE (Workspace Fields)
--------------------------------------------------
-- Since we are treating admissions as the central application entity, we add specific application processing fields
ALTER TABLE public.admissions
    ADD COLUMN IF NOT EXISTS application_status VARCHAR(50) DEFAULT 'Draft' 
        CHECK (application_status IN ('Draft', 'Application Started', 'Documents Pending', 'Documents Under Review', 'Documents Approved', 'Ready for Submission', 'Submitted to University', 'University Review', 'Additional Information Required', 'Approved', 'Rejected', 'Withdrawn', 'Admission Confirmed')),
    ADD COLUMN IF NOT EXISTS readiness_score INTEGER DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS missing_mandatory_docs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_action_description VARCHAR(255);

--------------------------------------------------
-- 5. EXTEND DOCUMENT VERSIONS (If not already fully supporting history)
--------------------------------------------------
-- The existing document_versions table from 0012 already stores historical blobs, but let's ensure it has verification status for history
ALTER TABLE public.document_versions
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS rejection_reason_id UUID REFERENCES public.document_rejection_reasons(id);
