-- Migration: University Portal (Profiles & RLS)
-- Description: Creates university_profiles to map users to universities and enforces strict RLS across core tables.

BEGIN;

--------------------------------------------------
-- 1. Create university_profiles
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.university_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    university_role VARCHAR(50) NOT NULL DEFAULT 'Viewer' 
        CHECK (university_role IN ('University Admin', 'Admission Officer', 'Finance Officer', 'Document Verification Officer', 'Viewer')),
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_uni_profiles_university_id ON public.university_profiles(university_id);

-- Enable RLS on university_profiles
ALTER TABLE public.university_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own university profile"
    ON public.university_profiles
    FOR SELECT
    USING (id = auth.uid());

-- Allow Admins and Super Admins full access to university_profiles
CREATE POLICY "Admins can manage university profiles"
    ON public.university_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            JOIN public.roles r ON u.role_id = r.id 
            WHERE u.id = auth.uid() AND r.name IN ('Admin', 'Super Admin')
        )
    );

--------------------------------------------------
-- 2. Helper Function for RLS
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_university_id()
RETURNS UUID AS $$
DECLARE
    v_uni_id UUID;
BEGIN
    SELECT university_id INTO v_uni_id
    FROM public.university_profiles
    WHERE id = auth.uid() AND is_active = TRUE;
    RETURN v_uni_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------
-- 3. Extend RLS on universities table
--------------------------------------------------
-- University users can view their own university details
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'universities' AND policyname = 'University users can view their own university'
    ) THEN
        CREATE POLICY "University users can view their own university"
            ON public.universities
            FOR SELECT
            USING (id = public.get_user_university_id());
    END IF;
END $$;

--------------------------------------------------
-- 4. Extend RLS on leads table
--------------------------------------------------
-- Enable university users to view and update leads assigned to them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'University users can view assigned leads'
    ) THEN
        CREATE POLICY "University users can view assigned leads"
            ON public.leads
            FOR SELECT
            USING (university_id = public.get_user_university_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'University users can update assigned leads'
    ) THEN
        CREATE POLICY "University users can update assigned leads"
            ON public.leads
            FOR UPDATE
            USING (university_id = public.get_user_university_id());
    END IF;
END $$;

--------------------------------------------------
-- 5. Extend RLS on admissions table
--------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admissions' AND policyname = 'University users can view their admissions'
    ) THEN
        CREATE POLICY "University users can view their admissions"
            ON public.admissions
            FOR SELECT
            USING (university_id = public.get_user_university_id());
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admissions' AND policyname = 'University users can update their admissions'
    ) THEN
        CREATE POLICY "University users can update their admissions"
            ON public.admissions
            FOR UPDATE
            USING (university_id = public.get_user_university_id());
    END IF;
END $$;

--------------------------------------------------
-- 6. Extend RLS on documents table
--------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'University users can view documents for their leads'
    ) THEN
        CREATE POLICY "University users can view documents for their leads"
            ON public.documents
            FOR SELECT
            USING (
                lead_id IN (SELECT id FROM public.leads WHERE university_id = public.get_user_university_id())
                OR
                admission_id IN (SELECT id FROM public.admissions WHERE university_id = public.get_user_university_id())
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'University users can update documents for their leads'
    ) THEN
        CREATE POLICY "University users can update documents for their leads"
            ON public.documents
            FOR UPDATE
            USING (
                lead_id IN (SELECT id FROM public.leads WHERE university_id = public.get_user_university_id())
                OR
                admission_id IN (SELECT id FROM public.admissions WHERE university_id = public.get_user_university_id())
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'University users can insert documents for their leads'
    ) THEN
        CREATE POLICY "University users can insert documents for their leads"
            ON public.documents
            FOR INSERT
            WITH CHECK (
                lead_id IN (SELECT id FROM public.leads WHERE university_id = public.get_user_university_id())
                OR
                admission_id IN (SELECT id FROM public.admissions WHERE university_id = public.get_user_university_id())
            );
    END IF;
END $$;

--------------------------------------------------
-- 7. Extend RLS on finance (university_payouts & university_invoices)
--------------------------------------------------
DO $$
BEGIN
    -- university_payouts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'university_payouts' AND policyname = 'University users can view their payouts'
    ) THEN
        CREATE POLICY "University users can view their payouts"
            ON public.university_payouts
            FOR SELECT
            USING (university_id = public.get_user_university_id());
    END IF;
END $$;

COMMIT;
