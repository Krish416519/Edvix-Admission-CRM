-- 00000000000154_fix_secondary_rls_role_strings.sql
-- Phase 2.1.1: Fix remaining user_role() string-based RLS policies in secondary modules
-- 
-- Context: Migrations 102-121 created RLS policies using user_role() IN ('Admin', 'Manager', etc.)
-- Risk Level: MODERATE. These affect domain-specific tables (university, partner, student, documents).
-- The core authorization functions (has_permission, is_super_admin, is_domain_admin) were 
-- remediated in Migration 152/153. These secondary policies still use string matching and 
-- would fail to include custom-named roles with equivalent authority.
--
-- Strategy: Convert 'Admin'/'Super Admin' checks to use is_admin_or_super() which
-- now delegates to the boolean flags (is_system_admin, is_domain_admin). 
-- For specialist roles ('Partner', 'University', 'Accounts') that represent external portal
-- identities, string-based checks are an intentional design decision, documented here.

-- ===== COUNSELING OS (Migration 106) =====
-- lead_objections table uses user_role() IN ('Admin', 'Super Admin', 'Manager')
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow read access to lead_objections" ON public.lead_objections;
    DROP POLICY IF EXISTS "Allow write access to lead_objections" ON public.lead_objections;
    DROP POLICY IF EXISTS "Allow update access to lead_objections" ON public.lead_objections;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Allow read access to lead_objections" ON public.lead_objections
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
                    l.assigned_counselor = auth.uid() OR
                    public.is_admin_or_super() OR
                    public.has_permission('View All Leads', 'Lead Management')
                )
            )
        );

    CREATE POLICY "Allow write access to lead_objections" ON public.lead_objections
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
                    l.assigned_counselor = auth.uid() OR
                    public.is_admin_or_super() OR
                    public.has_permission('Edit Leads', 'Lead Management')
                )
            )
        );

    CREATE POLICY "Allow update access to lead_objections" ON public.lead_objections
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
                    l.assigned_counselor = auth.uid() OR
                    public.is_admin_or_super() OR
                    public.has_permission('Edit Leads', 'Lead Management')
                )
            )
        );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ===== STUDENT LIFECYCLE (Migration 103) =====
-- Replace user_role() IN ('Super Admin', 'Admin', 'Manager') with is_admin_or_super()
DO $$
BEGIN
    DROP POLICY IF EXISTS "Full access university_enrollment_rules" ON public.university_enrollment_rules;
    DROP POLICY IF EXISTS "Full access student_enrollments" ON public.student_enrollments;
    DROP POLICY IF EXISTS "Full access enrollment_checklists" ON public.enrollment_checklists;
    DROP POLICY IF EXISTS "Full access student_support_tickets" ON public.student_support_tickets;
    DROP POLICY IF EXISTS "Full access student_support_messages" ON public.student_support_messages;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Full access university_enrollment_rules" ON public.university_enrollment_rules
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Enrollments', 'University Operations')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Full access student_enrollments" ON public.student_enrollments
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Enrollments', 'University Operations')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Full access enrollment_checklists" ON public.enrollment_checklists
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Enrollments', 'University Operations')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Full access student_support_tickets" ON public.student_support_tickets
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Enrollments', 'University Operations')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Full access student_support_messages" ON public.student_support_messages
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Enrollments', 'University Operations')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- ===== ACADEMIC ELIGIBILITY (Migration 107) =====
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin manage eligibility rules" ON public.academic_eligibility_rules;
    DROP POLICY IF EXISTS "Admin manage eligibility checks" ON public.academic_eligibility_checks;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Admin manage eligibility rules" ON public.academic_eligibility_rules
        FOR ALL USING (public.is_admin_or_super());
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Admin manage eligibility checks" ON public.academic_eligibility_checks
        FOR ALL USING (public.is_admin_or_super());
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- ===== PARTNER ECOSYSTEM (Migration 96) =====
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin full access partner_tiers" ON public.partner_tiers;
    DROP POLICY IF EXISTS "Admin full access partner_kyc" ON public.partner_kyc;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Admin full access partner_tiers" ON public.partner_tiers
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Partners', 'Partner Portal')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Admin full access partner_kyc" ON public.partner_kyc
        FOR ALL USING (
            public.is_admin_or_super() OR
            public.has_permission('Manage Partners', 'Partner Portal')
        );
EXCEPTION WHEN undefined_table THEN NULL; WHEN duplicate_object THEN NULL;
END $$;

-- DESIGN DECISION NOTE:
-- 'Partner', 'University', 'Accounts', and 'Counselor' role names remain as role-name
-- checks in older policies where they represent portal-specific external identities.
-- These are INTENTIONAL string checks — not authorization boundaries for internal users.
-- Portal identity roles are assigned by system administrators and explicitly grant 
-- access to specific external portals (partner portal, university portal, etc.).
-- These roles should NOT be confused with the general RBAC model for internal CRM users.
