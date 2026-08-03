-- 00000000000026_seed_default_roles_permissions.sql
-- Insert default Roles
INSERT INTO public.roles (name) VALUES
('Super Admin'),
('Admin'),
('Manager'),
('Counselor'),
('Accounts')
ON CONFLICT (name) DO NOTHING;

-- Insert default Permissions
INSERT INTO public.permissions (action, description, resource) VALUES
-- Lead Management
('View All Leads', 'Can view all leads in the system', 'Lead Management'),
('View Assigned Leads', 'Can view only assigned leads', 'Lead Management'),
('Edit Leads', 'Can modify lead details', 'Lead Management'),
('Delete Leads', 'Can delete leads', 'Lead Management'),
('Export Leads', 'Can export leads to CSV', 'Lead Management'),

-- Communication
('Send Emails', 'Can send emails to leads', 'Communication'),
('Send WhatsApp', 'Can send WhatsApp messages', 'Communication'),
('Bulk SMS', 'Can send bulk SMS', 'Communication'),
('View All Inbox', 'Can view all communications', 'Communication'),

-- System
('Manage Users', 'Can create and edit users', 'System'),
('Manage Roles', 'Can create and edit roles and permissions', 'System'),
('Access AI Settings', 'Can configure AI models and settings', 'System'),
('View Audit Logs', 'Can view security audit logs', 'System')
ON CONFLICT (action, resource) DO UPDATE SET description = EXCLUDED.description;

-- Optionally, we could map these permissions to roles in role_permissions, 
-- but we will let the Admin do it via the UI or just seed some defaults.
