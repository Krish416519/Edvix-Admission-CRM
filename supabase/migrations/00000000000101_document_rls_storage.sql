-- =============================================================================
-- 00000000000101_document_rls_storage.sql
-- Step 36: Security, Storage & Application Readiness Logic
-- =============================================================================

--------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY
--------------------------------------------------
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_rejection_reasons ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- 2. RLS POLICIES FOR CONFIGURATION TABLES
--------------------------------------------------
-- Requirements and Reasons are readable by everyone authenticated, but only manageable by Admins
CREATE POLICY "Anyone can read document requirements" 
ON public.document_requirements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage document requirements" 
ON public.document_requirements FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read document rejection reasons" 
ON public.document_rejection_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage document rejection reasons" 
ON public.document_rejection_reasons FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

--------------------------------------------------
-- 3. ENHANCED DOCUMENT RLS (IDOR PROTECTION)
--------------------------------------------------
-- Ensure counselors can't modify documents across orgs (already handled partially in 012, but we reaffirm)
DROP POLICY IF EXISTS "Counselors manage documents for their leads" ON public.documents;
CREATE POLICY "Counselors manage documents for their leads" 
ON public.documents FOR ALL TO authenticated 
USING (
    public.user_role() = 'Counselor' AND 
    lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
) WITH CHECK (
    public.user_role() = 'Counselor' AND 
    lead_id IN (SELECT id FROM public.leads WHERE assigned_counselor = auth.uid())
);

--------------------------------------------------
-- 4. APPLICATION READINESS SCORE CALCULATOR
--------------------------------------------------
-- This function calculates the readiness based on required documents vs uploaded/approved documents
CREATE OR REPLACE FUNCTION public.calculate_application_readiness(p_admission_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_required INTEGER := 0;
    v_total_approved INTEGER := 0;
    v_total_missing INTEGER := 0;
    v_score INTEGER := 0;
    v_university_id UUID;
    v_course_id UUID;
BEGIN
    -- Get university and course from admission
    SELECT university_id, course_id INTO v_university_id, v_course_id
    FROM public.admissions WHERE id = p_admission_id;
    
    -- Count total mandatory requirements for this application's university/course
    SELECT COUNT(*) INTO v_total_required
    FROM public.document_requirements
    WHERE is_active = true 
      AND is_mandatory = true
      AND (university_id = v_university_id OR university_id IS NULL)
      AND (course_id = v_course_id OR course_id IS NULL);
      
    -- Count approved documents linked to mandatory requirements
    SELECT COUNT(DISTINCT requirement_id) INTO v_total_approved
    FROM public.documents
    WHERE admission_id = p_admission_id 
      AND verification_status = 'Approved'
      AND requirement_id IN (
          SELECT id FROM public.document_requirements 
          WHERE is_active = true AND is_mandatory = true
            AND (university_id = v_university_id OR university_id IS NULL)
            AND (course_id = v_course_id OR course_id IS NULL)
      );
      
    -- Calculate missing
    v_total_missing := GREATEST(v_total_required - v_total_approved, 0);
    
    -- Calculate percentage
    IF v_total_required > 0 THEN
        v_score := (v_total_approved::FLOAT / v_total_required::FLOAT) * 100;
    ELSE
        v_score := 100; -- If no documents are required, it's 100% ready
    END IF;

    -- Update the admission record
    UPDATE public.admissions
    SET readiness_score = v_score,
        missing_mandatory_docs = v_total_missing,
        updated_at = NOW()
    WHERE id = p_admission_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------
-- 5. TRIGGER FOR READINESS CALCULATION
--------------------------------------------------
-- Fires when a document is added, deleted, or its verification status changes
CREATE OR REPLACE FUNCTION public.trg_update_readiness_on_doc_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.admission_id IS NOT NULL THEN
            -- We defer the execution to allow the transaction to proceed, 
            -- or just calculate it directly if it's fast enough.
            PERFORM public.calculate_application_readiness(NEW.admission_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.admission_id IS NOT NULL THEN
            PERFORM public.calculate_application_readiness(OLD.admission_id);
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_calc_readiness_doc
    AFTER INSERT OR UPDATE OF verification_status, requirement_id OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.trg_update_readiness_on_doc_change();

-- Also fire when admission's university or course changes
CREATE OR REPLACE FUNCTION public.trg_update_readiness_on_adm_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.university_id IS DISTINCT FROM NEW.university_id) OR (OLD.course_id IS DISTINCT FROM NEW.course_id) THEN
        PERFORM public.calculate_application_readiness(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_calc_readiness_adm
    AFTER UPDATE OF university_id, course_id ON public.admissions
    FOR EACH ROW EXECUTE FUNCTION public.trg_update_readiness_on_adm_change();
