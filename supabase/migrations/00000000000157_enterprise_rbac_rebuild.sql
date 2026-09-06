-- ==============================================================================
-- EDVIX CRM — ENTERPRISE RBAC & ORGANIZATIONAL REBUILD MIGRATION
-- File: apply_enterprise_rbac.sql / 00000000000157_enterprise_rbac_rebuild.sql
-- ==============================================================================

BEGIN;

-- 1. Create ACCESS_PROFILES table (Separates technical security access from business designation)
CREATE TABLE IF NOT EXISTS public.access_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    description TEXT,
    data_scope VARCHAR(50) NOT NULL DEFAULT 'OWN' CHECK (data_scope IN ('OWN', 'ASSIGNED', 'TEAM', 'DEPARTMENT', 'ORGANIZATION', 'CUSTOM')),
    is_system_profile BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. Create ACCESS_PROFILE_PERMISSIONS table (Granular permissions per profile)
CREATE TABLE IF NOT EXISTS public.access_profile_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_profile_id UUID NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(access_profile_id, permission_id)
);

-- 3. Safely update USERS and DESIGNATIONS tables
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS access_profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.designations
ADD COLUMN IF NOT EXISTS default_access_profile_id UUID REFERENCES public.access_profiles(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profile_permissions ENABLE ROW LEVEL SECURITY;

-- 5. Seed Canonical Permissions across all 7 Enterprise Business Groups
DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug) VALUES ('Edvix', 'edvix') RETURNING id INTO v_org_id;
    END IF;

    -- A. LEAD MANAGEMENT
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Leads', 'Lead Management', 'Can view leads subject to effective data scope'),
    (v_org_id, 'Create Leads', 'Lead Management', 'Can create new prospective student leads'),
    (v_org_id, 'Edit Leads', 'Lead Management', 'Can modify lead details, counseling notes, and stages'),
    (v_org_id, 'Delete Leads', 'Lead Management', 'High-risk: Can delete leads from system'),
    (v_org_id, 'Assign Leads', 'Lead Management', 'Can assign leads to counselors or teams'),
    (v_org_id, 'Reassign Leads', 'Lead Management', 'Can transfer existing leads between counselors'),
    (v_org_id, 'Import Leads', 'Lead Management', 'Can bulk import leads via CSV/Excel or webhook'),
    (v_org_id, 'Export Leads', 'Lead Management', 'High-risk: Can export leads data to CSV'),
    (v_org_id, 'Bulk Update Leads', 'Lead Management', 'Can perform bulk status/stage/counselor updates'),
    (v_org_id, 'Bulk Delete Leads', 'Lead Management', 'High-risk: Can delete multiple leads simultaneously')
    ON CONFLICT DO NOTHING;

    -- B. COMMUNICATION
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Own Conversations', 'Communication', 'Can view own calls, WhatsApp, and email logs'),
    (v_org_id, 'View Team Conversations', 'Communication', 'Can review communications of team members'),
    (v_org_id, 'View Department Conversations', 'Communication', 'Can view communications across department'),
    (v_org_id, 'View All Inbox', 'Communication', 'Can access global omnichannel communication inbox'),
    (v_org_id, 'Send WhatsApp', 'Communication', 'Can send direct WhatsApp messages to prospects'),
    (v_org_id, 'Send Email', 'Communication', 'Can send outbound emails to students'),
    (v_org_id, 'Send SMS', 'Communication', 'Can send SMS updates'),
    (v_org_id, 'Bulk WhatsApp', 'Communication', 'Can send bulk campaign WhatsApp messages'),
    (v_org_id, 'Bulk Email', 'Communication', 'Can execute bulk email campaigns'),
    (v_org_id, 'Bulk SMS', 'Communication', 'Can execute bulk SMS broadcasts'),
    (v_org_id, 'Manage Templates', 'Communication', 'Can create and edit WhatsApp and email templates')
    ON CONFLICT DO NOTHING;

    -- C. TASKS
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Own Tasks', 'Tasks', 'Can view personal tasks and follow-up reminders'),
    (v_org_id, 'View Team Tasks', 'Tasks', 'Can monitor tasks assigned to team members'),
    (v_org_id, 'Create Tasks', 'Tasks', 'Can schedule tasks and follow-ups'),
    (v_org_id, 'Edit Tasks', 'Tasks', 'Can update task deadlines, priorities, and notes'),
    (v_org_id, 'Assign Tasks', 'Tasks', 'Can assign tasks to other team members'),
    (v_org_id, 'Reassign Tasks', 'Tasks', 'Can reassign pending tasks'),
    (v_org_id, 'Complete Tasks', 'Tasks', 'Can mark follow-up tasks as completed'),
    (v_org_id, 'Delete Tasks', 'Tasks', 'Can delete scheduled tasks'),
    (v_org_id, 'Manage Task Rules', 'Tasks', 'Can configure automated follow-up rules')
    ON CONFLICT DO NOTHING;

    -- D. ADMISSIONS
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Applications', 'Admissions', 'Can view admission applications and submissions'),
    (v_org_id, 'Edit Applications', 'Admissions', 'Can edit student application forms'),
    (v_org_id, 'Update Admission Stage', 'Admissions', 'Can transition lead through admission pipeline'),
    (v_org_id, 'Manage Follow-ups', 'Admissions', 'Can schedule and log counseling follow-ups'),
    (v_org_id, 'Manage Counselling', 'Admissions', 'Can conduct and document academic counseling sessions'),
    (v_org_id, 'Manage Offers', 'Admissions', 'Can issue and verify conditional/unconditional offers'),
    (v_org_id, 'Manage Conversion', 'Admissions', 'Can mark admission conversions and fee confirmations'),
    (v_org_id, 'View Admission Analytics', 'Admissions', 'Can view departmental admission funnel metrics')
    ON CONFLICT DO NOTHING;

    -- E. HUMAN RESOURCES
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Employee Records', 'HR', 'Can view internal staff and employee profiles'),
    (v_org_id, 'Create Employee Records', 'HR', 'Can onboard new staff and counselors'),
    (v_org_id, 'Edit Employee Records', 'HR', 'Can update employee details, designation, and status'),
    (v_org_id, 'Manage HR Tasks', 'HR', 'Can manage HR ticketing and staff workflows'),
    (v_org_id, 'View HR Reports', 'HR', 'Can access staffing, attendance, and HR metrics'),
    (v_org_id, 'Manage HR Workflows', 'HR', 'Can configure employee lifecycle workflows')
    ON CONFLICT DO NOTHING;

    -- F. MARKETING
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'View Campaigns', 'Marketing', 'Can view marketing acquisition campaigns'),
    (v_org_id, 'Create Campaigns', 'Marketing', 'Can create campaigns and advertising trackers'),
    (v_org_id, 'Edit Campaigns', 'Marketing', 'Can edit campaign parameters, budgets, and links'),
    (v_org_id, 'Manage Lead Sources', 'Marketing', 'Can configure inbound channels, UTMs, and landing pages'),
    (v_org_id, 'View Marketing Analytics', 'Marketing', 'Can access CPA, CAC, and lead source conversion reports')
    ON CONFLICT DO NOTHING;

    -- G. ADMINISTRATION
    INSERT INTO public.permissions (organization_id, action, resource, description) VALUES
    (v_org_id, 'Manage Users', 'Administration', 'High-risk: Can create, edit, activate, and deactivate users'),
    (v_org_id, 'Manage Teams', 'Administration', 'Can create operational teams and assign leaders'),
    (v_org_id, 'Manage Departments', 'Administration', 'Can create, edit, or archive departments'),
    (v_org_id, 'Manage Designations', 'Administration', 'Can configure titles, hierarchy levels, and reports-to paths'),
    (v_org_id, 'Manage Access Profiles', 'Administration', 'High-risk: Can configure security profiles and permissions'),
    (v_org_id, 'Manage Permissions', 'Administration', 'High-risk: Can assign or override granular permissions'),
    (v_org_id, 'View Audit Logs', 'Administration', 'High-risk: Can view security and change audit trails'),
    (v_org_id, 'Manage System Settings', 'Administration', 'High-risk: Can modify system-wide settings and integrations')
    ON CONFLICT DO NOTHING;

END $$;

-- 6. Seed Enterprise Access Profiles with explicit Data Scopes
DO $$
DECLARE
    v_org_id UUID;
    v_dept_adm UUID;
    v_dept_hr UUID;
    v_dept_mkt UUID;
    v_dept_fin UUID;
    
    v_p_super UUID;
    v_p_adm_admin UUID;
    v_p_adm_mgr UUID;
    v_p_adm_tl UUID;
    v_p_counselor_std UUID;
    v_p_counselor_sr UUID;
    v_p_hr_admin UUID;
    v_p_hr_mgr UUID;
    v_p_hr_exec UUID;
    v_p_mkt_admin UUID;
    v_p_mkt_mgr UUID;
    v_p_mkt_exec UUID;
    v_p_fin_admin UUID;
    v_p_fin_mgr UUID;
    v_p_fin_exec UUID;
    v_p_readonly UUID;
    v_p_partner UUID;
    v_p_student UUID;
BEGIN
    SELECT id INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_dept_adm FROM public.departments WHERE code = 'ADM';
    SELECT id INTO v_dept_hr FROM public.departments WHERE code = 'HR';
    SELECT id INTO v_dept_mkt FROM public.departments WHERE code = 'MKT';
    SELECT id INTO v_dept_fin FROM public.departments WHERE code = 'FIN';

    -- Global Super Admin (Organization Scope)
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Super Admin', NULL, 'Unrestricted global system authority and governance across all departments', 'ORGANIZATION', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET data_scope = 'ORGANIZATION'
    RETURNING id INTO v_p_super;

    -- Admissions Access Profiles
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Admissions Admin', v_dept_adm, 'Operational administrator for Admissions department, teams, and counselors', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_adm, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_adm_admin;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Admissions Manager', v_dept_adm, 'Department manager monitoring admissions pipeline, conversion, and reassignment', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_adm, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_adm_mgr;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Admissions Team Leader', v_dept_adm, 'Operational team supervisor with visibility and distribution rights over team leads', 'TEAM', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_adm, data_scope = 'TEAM'
    RETURNING id INTO v_p_adm_tl;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Admissions Counselor - Standard', v_dept_adm, 'Frontline counselor handling strictly assigned leads, calls, and counseling', 'ASSIGNED', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_adm, data_scope = 'ASSIGNED'
    RETURNING id INTO v_p_counselor_std;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Admissions Counselor - Senior', v_dept_adm, 'Experienced counselor with collaborative team lead visibility and mentoring scope', 'TEAM', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_adm, data_scope = 'TEAM'
    RETURNING id INTO v_p_counselor_sr;

    -- HR Access Profiles
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'HR Admin', v_dept_hr, 'Administrator for Human Resources and staff onboarding', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_hr, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_hr_admin;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'HR Manager', v_dept_hr, 'Manager overseeing employee operations and HR workflows', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_hr, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_hr_mgr;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'HR Executive', v_dept_hr, 'Operational HR execution for documentation and internal communication', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_hr, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_hr_exec;

    -- Marketing Access Profiles
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Marketing Admin', v_dept_mkt, 'Administrator for campaigns, lead sources, and marketing integrations', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_mkt, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_mkt_admin;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Marketing Manager', v_dept_mkt, 'Manager monitoring acquisition campaigns, lead sources, and analytics', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_mkt, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_mkt_mgr;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Marketing Executive', v_dept_mkt, 'Marketing operations for campaign execution and source tagging', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_mkt, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_mkt_exec;

    -- Finance Access Profiles
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Finance Admin', v_dept_fin, 'Administrator for fee collection, reconciliations, and payment gateways', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_fin, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_fin_admin;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Finance Manager', v_dept_fin, 'Manager overseeing payment verifications and refunds', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_fin, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_fin_mgr;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Finance Executive', v_dept_fin, 'Operational fee entry and invoice generation', 'DEPARTMENT', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET department_id = v_dept_fin, data_scope = 'DEPARTMENT'
    RETURNING id INTO v_p_fin_exec;

    -- External Boundaries & Read Only
    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'Read Only', NULL, 'Read-only access across permitted modules without modification rights', 'ASSIGNED', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET data_scope = 'ASSIGNED'
    RETURNING id INTO v_p_readonly;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'External Partner', NULL, 'External referral partner limited to own submitted leads', 'OWN', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET data_scope = 'OWN'
    RETURNING id INTO v_p_partner;

    INSERT INTO public.access_profiles (organization_id, name, department_id, description, data_scope, is_system_profile)
    VALUES (v_org_id, 'External Student', NULL, 'Student portal identity limited to own application and profile', 'OWN', true)
    ON CONFLICT (organization_id, name) DO UPDATE SET data_scope = 'OWN'
    RETURNING id INTO v_p_student;

    -- 7. Populate Permissions for Access Profiles

    -- Super Admin gets ALL permissions
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_super, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Admissions Admin gets Lead Management, Communication, Tasks, Admissions, and Department Admin
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_adm_admin, id FROM public.permissions 
    WHERE resource IN ('Lead Management', 'Communication', 'Tasks', 'Admissions')
       OR action IN ('Manage Users', 'Manage Teams', 'View Audit Logs')
    ON CONFLICT DO NOTHING;

    -- Admissions Manager
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_adm_mgr, id FROM public.permissions 
    WHERE resource IN ('Lead Management', 'Communication', 'Tasks', 'Admissions')
      AND action NOT IN ('Delete Leads', 'Bulk Delete Leads')
    ON CONFLICT DO NOTHING;

    -- Admissions Team Leader
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_adm_tl, id FROM public.permissions 
    WHERE (resource = 'Lead Management' AND action IN ('View Leads', 'Create Leads', 'Edit Leads', 'Assign Leads', 'Reassign Leads'))
       OR (resource = 'Communication' AND action IN ('View Own Conversations', 'View Team Conversations', 'Send WhatsApp', 'Send Email', 'Send SMS'))
       OR (resource = 'Tasks' AND action IN ('View Own Tasks', 'View Team Tasks', 'Create Tasks', 'Edit Tasks', 'Assign Tasks', 'Complete Tasks'))
       OR (resource = 'Admissions' AND action IN ('View Applications', 'Edit Applications', 'Update Admission Stage', 'Manage Follow-ups', 'Manage Counselling'))
    ON CONFLICT DO NOTHING;

    -- Admissions Counselor - Standard
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_counselor_std, id FROM public.permissions 
    WHERE (resource = 'Lead Management' AND action IN ('View Leads', 'Create Leads', 'Edit Leads'))
       OR (resource = 'Communication' AND action IN ('View Own Conversations', 'Send WhatsApp', 'Send Email', 'Send SMS'))
       OR (resource = 'Tasks' AND action IN ('View Own Tasks', 'Create Tasks', 'Edit Tasks', 'Complete Tasks'))
       OR (resource = 'Admissions' AND action IN ('View Applications', 'Update Admission Stage', 'Manage Follow-ups', 'Manage Counselling'))
    ON CONFLICT DO NOTHING;

    -- Admissions Counselor - Senior
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_counselor_sr, id FROM public.permissions 
    WHERE (resource = 'Lead Management' AND action IN ('View Leads', 'Create Leads', 'Edit Leads', 'Assign Leads'))
       OR (resource = 'Communication' AND action IN ('View Own Conversations', 'View Team Conversations', 'Send WhatsApp', 'Send Email', 'Send SMS'))
       OR (resource = 'Tasks' AND action IN ('View Own Tasks', 'View Team Tasks', 'Create Tasks', 'Edit Tasks', 'Complete Tasks'))
       OR (resource = 'Admissions' AND action IN ('View Applications', 'Update Admission Stage', 'Manage Follow-ups', 'Manage Counselling', 'Manage Offers'))
    ON CONFLICT DO NOTHING;

    -- HR Admin
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_hr_admin, id FROM public.permissions 
    WHERE resource = 'HR' OR action IN ('Manage Users', 'View Audit Logs')
    ON CONFLICT DO NOTHING;

    -- Marketing Admin
    INSERT INTO public.access_profile_permissions (access_profile_id, permission_id)
    SELECT v_p_mkt_admin, id FROM public.permissions 
    WHERE resource = 'Marketing' OR action IN ('View Leads', 'Export Leads', 'Manage Lead Sources')
    ON CONFLICT DO NOTHING;

    -- 8. Link Default Access Profile to Designations
    UPDATE public.designations SET default_access_profile_id = v_p_adm_admin WHERE name = 'Admissions Admin';
    UPDATE public.designations SET default_access_profile_id = v_p_adm_mgr WHERE name = 'Admissions Manager';
    UPDATE public.designations SET default_access_profile_id = v_p_adm_tl WHERE name = 'Team Leader';
    UPDATE public.designations SET default_access_profile_id = v_p_counselor_std WHERE name = 'Academic Counselor';

    UPDATE public.designations SET default_access_profile_id = v_p_hr_admin WHERE name = 'HR Admin';
    UPDATE public.designations SET default_access_profile_id = v_p_hr_mgr WHERE name = 'HR Manager';
    UPDATE public.designations SET default_access_profile_id = v_p_hr_exec WHERE name = 'HR Executive';

    UPDATE public.designations SET default_access_profile_id = v_p_mkt_admin WHERE name = 'Marketing Admin';
    UPDATE public.designations SET default_access_profile_id = v_p_mkt_mgr WHERE name = 'Marketing Manager';
    UPDATE public.designations SET default_access_profile_id = v_p_mkt_exec WHERE name = 'Marketing Executive';

    UPDATE public.designations SET default_access_profile_id = v_p_fin_admin WHERE name = 'Finance Admin';
    UPDATE public.designations SET default_access_profile_id = v_p_fin_mgr WHERE name = 'Finance Manager';
    UPDATE public.designations SET default_access_profile_id = v_p_fin_exec WHERE name = 'Finance Executive';

    -- 9. Seed Operational Teams for Admissions if empty
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE department_id = v_dept_adm) THEN
        INSERT INTO public.teams (department_id, name, status) VALUES
        (v_dept_adm, 'Team Alpha', 'Active'),
        (v_dept_adm, 'Team Beta', 'Active'),
        (v_dept_adm, 'Team Gamma', 'Active');
    END IF;

    -- 10. Safely Backfill Existing Users to the New Architecture
    -- Super Admin (Krishna)
    UPDATE public.users 
    SET department_id = v_dept_adm,
        designation_id = (SELECT id FROM public.designations WHERE name = 'Admissions Admin' AND department_id = v_dept_adm LIMIT 1),
        access_profile_id = v_p_super
    WHERE email = 'degreepartners@gmail.com';

    -- Counselors (Shivam, User A, User B, Raghav)
    UPDATE public.users 
    SET department_id = v_dept_adm,
        designation_id = (SELECT id FROM public.designations WHERE name = 'Academic Counselor' AND department_id = v_dept_adm LIMIT 1),
        access_profile_id = v_p_counselor_std
    WHERE email IN ('krishdigitallifeegg@gmail.com', 'testuser-a@kilo.test', 'testuser-b@kilo.test', 'raghav@edvix.in');

    -- Assign first Admissions team to active counselors
    UPDATE public.users 
    SET team_id = (SELECT id FROM public.teams WHERE department_id = v_dept_adm ORDER BY name ASC LIMIT 1)
    WHERE department_id = v_dept_adm AND designation_id = (SELECT id FROM public.designations WHERE name = 'Academic Counselor' LIMIT 1);

END $$;

-- 11. Core Backend Authorization Functions

-- A. Recursive cycle-detection check for reporting hierarchy
CREATE OR REPLACE FUNCTION public.validate_reporting_hierarchy(p_user_id UUID, p_manager_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    v_curr_id UUID;
    v_depth INTEGER := 0;
BEGIN
    IF p_user_id IS NULL OR p_manager_id IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- A user cannot report to themselves
    IF p_user_id = p_manager_id THEN
        RETURN FALSE;
    END IF;

    -- Traverse up the reporting tree starting from p_manager_id
    v_curr_id := p_manager_id;
    WHILE v_curr_id IS NOT NULL AND v_depth < 50 LOOP
        IF v_curr_id = p_user_id THEN
            -- Cycle detected!
            RETURN FALSE;
        END IF;
        
        SELECT manager_id INTO v_curr_id FROM public.users WHERE id = v_curr_id;
        v_depth := v_depth + 1;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger to enforce valid reporting hierarchy on users table
CREATE OR REPLACE FUNCTION public.trg_check_reporting_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.manager_id IS NOT NULL AND (OLD.manager_id IS NULL OR NEW.manager_id <> OLD.manager_id) THEN
        IF NOT public.validate_reporting_hierarchy(NEW.id, NEW.manager_id) THEN
            RAISE EXCEPTION 'Circular reporting hierarchy detected: User % cannot report to User %', NEW.id, NEW.manager_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_circular_reporting ON public.users;
CREATE TRIGGER trg_prevent_circular_reporting
    BEFORE INSERT OR UPDATE OF manager_id ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_check_reporting_hierarchy();

-- B. Get Effective Data Scope for a User
CREATE OR REPLACE FUNCTION public.get_user_data_scope(p_user_id UUID, p_resource VARCHAR DEFAULT 'Lead Management')
RETURNS VARCHAR AS $$
DECLARE
    v_scope VARCHAR;
    v_is_super BOOLEAN;
BEGIN
    -- Super Admin has ORGANIZATION scope
    SELECT (u.is_platform_super_admin OR r.name = 'Super Admin' OR ap.name = 'Super Admin')
    INTO v_is_super
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = p_user_id;

    IF v_is_super THEN
        RETURN 'ORGANIZATION';
    END IF;

    -- Check access profile scope
    SELECT ap.data_scope INTO v_scope
    FROM public.users u
    JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = p_user_id;

    RETURN COALESCE(v_scope, 'ASSIGNED');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- C. Check if Actor can manage a Target User (Privilege Escalation Prevention)
CREATE OR REPLACE FUNCTION public.can_manage_user(p_actor_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_actor_is_super BOOLEAN;
    v_actor_dept UUID;
    v_target_dept UUID;
    v_actor_level INT;
    v_target_level INT;
BEGIN
    -- Super Admin can manage anyone
    SELECT (u.is_platform_super_admin OR r.name = 'Super Admin' OR ap.name = 'Super Admin')
    INTO v_actor_is_super
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = p_actor_id;

    IF v_actor_is_super THEN
        RETURN TRUE;
    END IF;

    -- Actor cannot edit themselves to escalate role
    IF p_actor_id = p_target_user_id THEN
        RETURN FALSE;
    END IF;

    -- Get actor and target department and designation levels
    SELECT u.department_id, COALESCE(d.level, 0)
    INTO v_actor_dept, v_actor_level
    FROM public.users u
    LEFT JOIN public.designations d ON u.designation_id = d.id
    WHERE u.id = p_actor_id;

    SELECT u.department_id, COALESCE(d.level, 0)
    INTO v_target_dept, v_target_level
    FROM public.users u
    LEFT JOIN public.designations d ON u.designation_id = d.id
    WHERE u.id = p_target_user_id;

    -- Actor must be in same department and have strictly higher designation level
    IF v_actor_dept IS NOT NULL AND v_actor_dept = v_target_dept AND v_actor_level > v_target_level THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- D. Lead Access Validation (Enforces Data Scopes & Department Isolation)
CREATE OR REPLACE FUNCTION public.can_access_lead(p_lead_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    v_scope VARCHAR;
    v_user_dept UUID;
    v_user_team UUID;
    v_assigned_counselor UUID;
    v_lead_dept UUID;
    v_lead_team UUID;
    v_is_super BOOLEAN;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check Super Admin
    SELECT (u.is_platform_super_admin OR r.name = 'Super Admin' OR ap.name = 'Super Admin')
    INTO v_is_super
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = p_user_id;

    IF v_is_super THEN
        RETURN TRUE;
    END IF;

    -- Get user context
    SELECT u.department_id, u.team_id
    INTO v_user_dept, v_user_team
    FROM public.users u
    WHERE u.id = p_user_id;

    -- Get effective data scope
    v_scope := public.get_user_data_scope(p_user_id, 'Lead Management');

    -- Get lead's assigned counselor
    SELECT assigned_counselor INTO v_assigned_counselor
    FROM public.leads
    WHERE id = p_lead_id;

    -- Check Scope: ASSIGNED or OWN
    IF v_assigned_counselor = p_user_id THEN
        RETURN TRUE;
    END IF;

    IF v_scope IN ('OWN', 'ASSIGNED') THEN
        -- Check if user is recursive manager of the assigned counselor
        IF v_assigned_counselor IS NOT NULL AND public.is_manager_of(v_assigned_counselor) THEN
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    -- Scope: TEAM
    IF v_scope = 'TEAM' THEN
        IF v_assigned_counselor IS NOT NULL THEN
            SELECT team_id INTO v_lead_team FROM public.users WHERE id = v_assigned_counselor;
            IF v_lead_team IS NOT NULL AND v_lead_team = v_user_team THEN
                RETURN TRUE;
            END IF;
        END IF;
        IF public.is_manager_of(v_assigned_counselor) THEN
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    -- Scope: DEPARTMENT
    IF v_scope = 'DEPARTMENT' THEN
        IF v_assigned_counselor IS NOT NULL THEN
            SELECT department_id INTO v_lead_dept FROM public.users WHERE id = v_assigned_counselor;
            IF v_lead_dept IS NOT NULL AND v_lead_dept = v_user_dept THEN
                RETURN TRUE;
            END IF;
        ELSE
            -- Unassigned lead can be viewed by department managers/admins
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    -- Scope: ORGANIZATION
    IF v_scope = 'ORGANIZATION' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- E. Unified `has_permission` incorporating Access Profiles & User Overrides
CREATE OR REPLACE FUNCTION public.has_permission(p_action VARCHAR, p_resource VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_super BOOLEAN;
    v_perm_id UUID;
    v_is_denied BOOLEAN;
    v_is_granted BOOLEAN;
    v_profile_id UUID;
    v_role_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Super Admin bypass
    SELECT (u.is_platform_super_admin OR r.name = 'Super Admin' OR ap.name = 'Super Admin')
    INTO v_is_super
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = v_user_id;

    IF v_is_super THEN
        RETURN TRUE;
    END IF;

    -- Find matching permission ID (case-insensitive)
    SELECT id INTO v_perm_id FROM public.permissions 
    WHERE LOWER(action) = LOWER(p_action) AND LOWER(resource) = LOWER(p_resource)
    LIMIT 1;

    IF v_perm_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Explicit User Override DENY
    SELECT TRUE INTO v_is_denied
    FROM public.user_permission_overrides
    WHERE user_id = v_user_id AND permission_id = v_perm_id AND is_deny = TRUE;

    IF v_is_denied THEN
        RETURN FALSE;
    END IF;

    -- 3. Explicit User Override GRANT
    SELECT TRUE INTO v_is_granted
    FROM public.user_permission_overrides
    WHERE user_id = v_user_id AND permission_id = v_perm_id AND is_deny = FALSE;

    IF v_is_granted THEN
        RETURN TRUE;
    END IF;

    -- 4. Access Profile Permissions
    SELECT access_profile_id, role_id INTO v_profile_id, v_role_id
    FROM public.users WHERE id = v_user_id;

    IF v_profile_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.access_profile_permissions
            WHERE access_profile_id = v_profile_id AND permission_id = v_perm_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- 5. Fallback Legacy Role Permissions
    IF v_role_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.role_permissions
            WHERE role_id = v_role_id AND permission_id = v_perm_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- F. Unified `get_user_permissions` listing effective permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID)
RETURNS TABLE (action VARCHAR, resource VARCHAR) AS $$
DECLARE
    v_is_super BOOLEAN;
    v_profile_id UUID;
    v_role_id UUID;
BEGIN
    SELECT (u.is_platform_super_admin OR r.name = 'Super Admin' OR ap.name = 'Super Admin'),
           u.access_profile_id, u.role_id
    INTO v_is_super, v_profile_id, v_role_id
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    LEFT JOIN public.access_profiles ap ON u.access_profile_id = ap.id
    WHERE u.id = p_user_id;

    IF v_is_super THEN
        RETURN QUERY SELECT p.action, p.resource FROM public.permissions p;
        RETURN;
    END IF;

    RETURN QUERY
    -- Base Profile Permissions
    (
        SELECT p.action, p.resource 
        FROM public.permissions p
        JOIN public.access_profile_permissions app ON p.id = app.permission_id
        WHERE app.access_profile_id = v_profile_id
        AND p.id NOT IN (
            SELECT permission_id FROM public.user_permission_overrides 
            WHERE user_id = p_user_id AND is_deny = TRUE
        )
        UNION
        -- Legacy Role Permissions (if profile is unassigned)
        SELECT p.action, p.resource 
        FROM public.permissions p
        JOIN public.role_permissions rp ON p.id = rp.permission_id
        WHERE v_profile_id IS NULL AND rp.role_id = v_role_id
        AND p.id NOT IN (
            SELECT permission_id FROM public.user_permission_overrides 
            WHERE user_id = p_user_id AND is_deny = TRUE
        )
        UNION
        -- User Custom Overrides
        SELECT p.action, p.resource 
        FROM public.permissions p
        JOIN public.user_permission_overrides upo ON p.id = upo.permission_id
        WHERE upo.user_id = p_user_id AND upo.is_deny = FALSE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 12. Update RLS Policies for Access Control and Data Scopes

-- LEADS POLICIES
DROP POLICY IF EXISTS "Enable Read Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Update Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Create Leads" ON public.leads;
DROP POLICY IF EXISTS "Unified Scoped Read Leads" ON public.leads;
DROP POLICY IF EXISTS "Unified Scoped Update Leads" ON public.leads;
DROP POLICY IF EXISTS "Unified Scoped Delete Leads" ON public.leads;

CREATE POLICY "Unified Scoped Read Leads" ON public.leads FOR SELECT
USING (
    public.is_super_admin() OR
    public.can_access_lead(id) OR
    assigned_counselor = auth.uid()
);

CREATE POLICY "Unified Scoped Update Leads" ON public.leads FOR UPDATE
USING (
    public.is_super_admin() OR
    (
        public.can_access_lead(id) AND 
        (public.has_permission('Edit Leads', 'Lead Management') OR assigned_counselor = auth.uid())
    )
);

CREATE POLICY "Unified Scoped Delete Leads" ON public.leads FOR DELETE
USING (
    public.is_super_admin() OR
    (public.can_access_lead(id) AND public.has_permission('Delete Leads', 'Lead Management'))
);

CREATE POLICY "Enable Create Leads" ON public.leads FOR INSERT 
WITH CHECK (
    public.is_super_admin() OR 
    public.has_permission('Create Leads', 'Lead Management') OR
    public.has_permission('Edit Leads', 'Lead Management')
);

-- ACCESS PROFILES POLICIES
CREATE POLICY "Super Admins can manage access profiles" ON public.access_profiles
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can read access profiles" ON public.access_profiles
    FOR SELECT USING (true);

CREATE POLICY "Super Admins can manage profile permissions" ON public.access_profile_permissions
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can read profile permissions" ON public.access_profile_permissions
    FOR SELECT USING (true);

-- DEPARTMENTS & DESIGNATIONS & TEAMS POLICIES
CREATE POLICY "Super Admins can manage departments" ON public.departments
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can read departments" ON public.departments
    FOR SELECT USING (true);

CREATE POLICY "Super Admins can manage designations" ON public.designations
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can read designations" ON public.designations
    FOR SELECT USING (true);

CREATE POLICY "Super Admins can manage teams" ON public.teams
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Users can read teams" ON public.teams
    FOR SELECT USING (true);

COMMIT;
