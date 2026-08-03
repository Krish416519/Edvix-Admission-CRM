-- =============================================================================
-- 00000000000012_documents_module.sql
-- Production-ready Document Management Module for Edvix AI CRM
-- =============================================================================

--------------------------------------------------
-- STEP 1: DROP OLD DOCUMENTS TABLE
--------------------------------------------------

-- Drop old RLS policies
DROP POLICY IF EXISTS "Admins full access documents" ON public.documents;
DROP POLICY IF EXISTS "Counselors view/edit documents for own leads" ON public.documents;
DROP POLICY IF EXISTS "Accounts view documents" ON public.documents;

-- The old table has no other dependencies natively referencing it right now (unless user added custom ones, which cascade will handle).
DROP TABLE IF EXISTS public.documents CASCADE;

--------------------------------------------------
-- STEP 2: SEQUENCES
--------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.document_number_seq START 1;

--------------------------------------------------
-- STEP 3: CORE DOCUMENTS TABLE
--------------------------------------------------
CREATE TABLE public.documents (
    -- Identity
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number         VARCHAR(30) UNIQUE NOT NULL DEFAULT '',

    -- Relationships
    lead_id                 UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    admission_id            UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    student_name            VARCHAR(255),

    -- Storage info
    document_type           VARCHAR(100) NOT NULL,
    bucket_name             VARCHAR(100) NOT NULL,
    storage_path            TEXT NOT NULL,
    
    -- File Metadata
    original_file_name      VARCHAR(255) NOT NULL,
    stored_file_name        VARCHAR(255) NOT NULL,
    file_size               BIGINT NOT NULL DEFAULT 0, -- in bytes
    file_type               VARCHAR(100) NOT NULL,     -- MIME type
    checksum                VARCHAR(255),              -- e.g. MD5 or SHA256
    
    -- Status & Versioning
    version                 INTEGER NOT NULL DEFAULT 1,
    verification_status     VARCHAR(50) NOT NULL DEFAULT 'Pending' 
                            CHECK (verification_status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Need Resubmission')),
    remarks                 TEXT,

    -- Audit
    uploaded_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verification_date       TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ DEFAULT NULL,
    
    -- Must link to a lead or admission
    CHECK (lead_id IS NOT NULL OR admission_id IS NOT NULL)
);

-- Auto-generate document_number via trigger
CREATE OR REPLACE FUNCTION public.generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.document_number := 'DOC-' || EXTRACT(YEAR FROM NOW())::TEXT
                            || '-' || LPAD(nextval('public.document_number_seq')::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_generate_document_number
    BEFORE INSERT ON public.documents
    FOR EACH ROW
    WHEN (NEW.document_number = '' OR NEW.document_number IS NULL)
    EXECUTE FUNCTION public.generate_document_number();

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_documents
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 4: DOCUMENT VERSIONS TABLE
--------------------------------------------------
CREATE TABLE public.document_versions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id             UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    
    version_number          INTEGER NOT NULL,
    bucket_name             VARCHAR(100) NOT NULL,
    storage_path            TEXT NOT NULL,
    original_file_name      VARCHAR(255) NOT NULL,
    stored_file_name        VARCHAR(255) NOT NULL,
    file_size               BIGINT NOT NULL,
    file_type               VARCHAR(100) NOT NULL,
    checksum                VARCHAR(255),
    
    uploaded_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (document_id, version_number)
);

-- Trigger to automatically create a version record when a document is inserted or its path changes
CREATE OR REPLACE FUNCTION public.log_document_version()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND NEW.storage_path IS DISTINCT FROM OLD.storage_path) THEN
       
        INSERT INTO public.document_versions (
            document_id, version_number, bucket_name, storage_path, 
            original_file_name, stored_file_name, file_size, file_type, checksum, uploaded_by
        ) VALUES (
            NEW.id, NEW.version, NEW.bucket_name, NEW.storage_path, 
            NEW.original_file_name, NEW.stored_file_name, NEW.file_size, NEW.file_type, NEW.checksum, NEW.uploaded_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_document_version
    AFTER INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.log_document_version();

--------------------------------------------------
-- STEP 5: DOCUMENT VERIFICATION LOG TABLE
--------------------------------------------------
CREATE TABLE public.document_verification (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id             UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    
    previous_status         VARCHAR(50),
    new_status              VARCHAR(50) NOT NULL,
    comments                TEXT,
    
    verified_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_by_name        VARCHAR(255),
    verified_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to track verification status changes
CREATE OR REPLACE FUNCTION public.log_document_verification()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
        SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
        
        INSERT INTO public.document_verification (
            document_id, previous_status, new_status, comments, verified_by, verified_by_name
        ) VALUES (
            NEW.id, OLD.verification_status, NEW.verification_status, NEW.remarks, auth.uid(), COALESCE(v_user_name, 'System')
        );
        
        -- Set verification date on main table
        NEW.verification_date := NOW();
        NEW.verified_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_document_verification
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.log_document_verification();

--------------------------------------------------
-- STEP 6: DOCUMENT COMMENTS TABLE
--------------------------------------------------
CREATE TABLE public.document_comments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id             UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    content                 TEXT NOT NULL,
    
    author_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author_name             VARCHAR(255),
    
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ DEFAULT NULL
);

CREATE TRIGGER set_updated_at_document_comments
    BEFORE UPDATE ON public.document_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- STEP 7: ACTIVITY TIMELINE LOGGING (Lead Activities)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_document_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_lead_id UUID;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
    
    -- Determine lead_id (might need to fetch from admission if not directly attached)
    v_lead_id := NEW.lead_id;
    IF v_lead_id IS NULL AND NEW.admission_id IS NOT NULL THEN
        SELECT lead_id INTO v_lead_id FROM public.admissions WHERE id = NEW.admission_id;
    END IF;

    IF v_lead_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO public.lead_activities (lead_id, type, content, author, metadata)
            VALUES (
                v_lead_id,
                'document_upload',
                'Uploaded document: ' || NEW.original_file_name,
                COALESCE(v_user_name, 'System'),
                jsonb_build_object('document_id', NEW.id, 'type', NEW.document_type)
            );
        ELSIF TG_OP = 'UPDATE' THEN
            -- Check for replacement
            IF NEW.version > OLD.version THEN
                INSERT INTO public.lead_activities (lead_id, type, content, author, metadata)
                VALUES (
                    v_lead_id,
                    'document_upload',
                    'Replaced document: ' || NEW.original_file_name || ' (v' || NEW.version || ')',
                    COALESCE(v_user_name, 'System'),
                    jsonb_build_object('document_id', NEW.id, 'type', NEW.document_type)
                );
            END IF;
            
            -- Check for verification status change
            IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
                INSERT INTO public.lead_activities (lead_id, type, content, author, metadata)
                VALUES (
                    v_lead_id,
                    'status_change', -- using existing activity type
                    'Document "' || NEW.original_file_name || '" marked as ' || NEW.verification_status,
                    COALESCE(v_user_name, 'System'),
                    jsonb_build_object('document_id', NEW.id, 'type', NEW.document_type)
                );
            END IF;
        END IF;
    END IF;

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_document_activity
    AFTER INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.log_document_activity();

--------------------------------------------------
-- STEP 8: INDEXES
--------------------------------------------------
CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);
CREATE INDEX idx_documents_admission_id ON public.documents(admission_id);
CREATE INDEX idx_documents_status ON public.documents(verification_status);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at);
CREATE INDEX idx_document_versions_doc_id ON public.document_versions(document_id);
CREATE INDEX idx_document_verification_doc_id ON public.document_verification(document_id);
CREATE INDEX idx_document_comments_doc_id ON public.document_comments(document_id);

--------------------------------------------------
-- STEP 9: ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- *** DOCUMENTS POLICIES ***
CREATE POLICY "Admins full access documents" 
ON public.documents FOR ALL TO authenticated 
USING (public.is_admin());

CREATE POLICY "Counselors manage documents for their leads" 
ON public.documents FOR ALL TO authenticated 
USING (
    public.user_role() = 'Counselor' AND 
    lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);

CREATE POLICY "Accounts read documents" 
ON public.documents FOR SELECT TO authenticated 
USING (public.user_role() = 'Accounts');

-- *** VERSIONS POLICIES ***
CREATE POLICY "Admins full access document versions" 
ON public.document_versions FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users read document versions for their leads" 
ON public.document_versions FOR SELECT TO authenticated 
USING (
    document_id IN (
        SELECT id FROM public.documents WHERE lead_id IN (
            SELECT id FROM public.leads WHERE assigned_counselor = auth.uid()
        )
    )
);

-- *** VERIFICATION POLICIES ***
CREATE POLICY "Admins full access document verification" 
ON public.document_verification FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users read document verification for their leads" 
ON public.document_verification FOR SELECT TO authenticated 
USING (
    document_id IN (
        SELECT id FROM public.documents WHERE lead_id IN (
            SELECT id FROM public.leads WHERE assigned_counselor = auth.uid()
        )
    )
);

-- *** COMMENTS POLICIES ***
CREATE POLICY "Admins full access document comments" 
ON public.document_comments FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Counselors manage document comments for their leads" 
ON public.document_comments FOR ALL TO authenticated 
USING (
    document_id IN (
        SELECT id FROM public.documents WHERE lead_id IN (
            SELECT id FROM public.leads WHERE assigned_counselor = auth.uid()
        )
    )
);

--------------------------------------------------
-- STEP 10: REALTIME
--------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_verification;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_comments;

--------------------------------------------------
-- STEP 11: STORAGE SECURITY POLICIES
-- Requires buckets to be created manually beforehand:
-- student-documents, payment-receipts, profile-photos, university-documents, system-files
--------------------------------------------------

-- Ensure storage policies exist for authenticated users to manage files in the buckets
-- This will only work if the buckets exist and the storage extension is active.
-- (We'll use a DO block to prevent errors if the schema isn't ready)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'storage') THEN
        -- Allow authenticated users to select objects
        DROP POLICY IF EXISTS "Authenticated users can select objects" ON storage.objects;
        CREATE POLICY "Authenticated users can select objects" ON storage.objects FOR SELECT TO authenticated USING (true);
        
        -- Allow authenticated users to insert objects
        DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
        CREATE POLICY "Authenticated users can upload objects" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
        
        -- Allow authenticated users to update objects
        DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
        CREATE POLICY "Authenticated users can update objects" ON storage.objects FOR UPDATE TO authenticated USING (true);
        
        -- Allow authenticated users to delete objects
        DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;
        CREATE POLICY "Authenticated users can delete objects" ON storage.objects FOR DELETE TO authenticated USING (true);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
