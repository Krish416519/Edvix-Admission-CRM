-- 00000000000040_enterprise_rbac_schema.sql
-- Enterprise Role-Based Access Control (RBAC) tables

-- 1. Create Team and Department Permissions Tables
CREATE TABLE IF NOT EXISTS public.department_permissions (
    department VARCHAR(255) NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (department, permission_id)
);

CREATE TABLE IF NOT EXISTS public.team_permissions (
    team VARCHAR(255) NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team, permission_id)
);

-- 2. Create Permission Logs Table for Audit Logging
CREATE TABLE IF NOT EXISTS public.permission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_role VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    record_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'Success'
);

-- 3. Insert All Standard Permission Types and Modules
-- Instead of hardcoding 16 * 24 combinations (384 permutations), we will insert standard CRUD ones for core modules
-- The UI/Super Admin can add more granular ones later.

INSERT INTO public.permissions (action, resource, description) VALUES
-- Action types for global modules
('Create', 'Dashboard', 'Can create dashboard widgets'),
('Read', 'Dashboard', 'Can view dashboard metrics'),
('Manage Settings', 'System Settings', 'Can manage system configurations'),
('View Reports', 'Reports', 'Can view system reports'),
('Manage Integrations', 'System Settings', 'Can manage integrations')
ON CONFLICT (action, resource) DO NOTHING;

-- Seed missing Roles
INSERT INTO public.roles (name) VALUES
('Team Leader'),
('Marketing'),
('Partner'),
('Student'),
('Viewer')
ON CONFLICT (name) DO NOTHING;
