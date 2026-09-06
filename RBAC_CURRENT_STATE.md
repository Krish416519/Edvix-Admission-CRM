# RBAC Current State Audit

## 1. Existing Authentication Architecture
- Built on **Supabase Auth**.
- Handled primarily by `AuthContext.tsx`.
- User data is synced to the public `users` table via trigger (`00000000000006_auth_profile_trigger.sql` likely).

## 2. Existing User Architecture
- `users` table includes: `id` (FK to auth.users), `email`, `name`, `full_name`, `role_id`, `avatar_url`, `is_active`, `department` (text), `team` (text), `manager_id`, `is_platform_super_admin`, `created_at`, `updated_at`, `last_login`, `phone`.
- Soft deletion/deactivation exists (`is_active` boolean).

## 3. Existing Roles
- Live in `roles` table.
- Known roles: `Super Admin`, `Admin`, `Manager`, `Counselor`, `Accounts`, `Team Leader`, `Marketing`, `Partner`, `Student`, `Viewer`.
- No strict domain associations in the `roles` table itself.

## 4. Existing Departments/Domains
- **No `domains` table exists.**
- `department` is currently a plain `varchar` column on the `users` table.
- `department_permissions` table exists for mapping text departments to permissions.

## 5. Existing Permissions
- Live in `permissions` table (`action`, `resource`, `description`).
- Mapped via `role_permissions`, `department_permissions`, `team_permissions`.
- Generic actions like "View All Leads", "View Assigned Leads", "Edit Leads".
- Frontend `useAuth().hasPermission()` checks these strings.

## 6. Existing RLS
- Enforced on `leads`, `calls`, `tasks`, etc.
- Often checks `assigned_counselor = auth.uid()` or similar organization scoping (`organization_id`).
- There are some roles-based RLS bypasses (e.g., `Super Admin` bypass). 

## 7. Existing User-Management Logic
- Unclear robust frontend user management, though `Admin` and `Super Admin` exist.
- User creation requires creating an identity in `auth.users`, which currently requires Supabase Service Role key if done from the backend, or uses public signup (needs verification).

## 8. Existing Lead Ownership/Assignment
- `leads` table has `assigned_counselor` (FK to users).
- `lead_assignments` table tracks assignment history (`lead_id`, `assignee_id`, `assigned_by`, `previous_assignee_id`).

## 9. Existing Historical Tracking
- `lead_disposition_history` tracks status changes.
- `lead_activities` tracks generic activities.
- History mostly tracks `created_by`, `assigned_by` fields using user UUIDs.

## 10. Existing Audit Functionality
- `permission_logs` table exists for basic CRUD logging (populated by `log_permission_event()` trigger).
- It lacks comprehensive `actor_name_snapshot`, `actor_role_snapshot`, `domain_id`, etc. (only logs `user_id`, `user_role`, `action`, `module`, `record_id`).

## 11. Existing Deletion Behavior
- Most tables support soft deletion (`deleted_at` / `is_active`).
- Users table uses `is_active` boolean.

## 12. Existing Frontend Authorization
- Many hardcoded role checks (`role === 'Admin' || role === 'Super Admin'`).
- Mixed usage of `hasRole(['Super Admin'])`, `hasPermission('View All Leads', 'Lead Management')`.
- `AuthContext.tsx` contains a fallback allowing all Counselors access to Lead Management if omitted.

## 13. Existing Backend Authorization
- `get_user_permissions` RPC fetches permissions.
- `has_permission` DB function exists to evaluate Role + Team + Department permissions.
- RLS policies use these or direct role name checks.

## 14. Security Vulnerabilities
- Hardcoded frontend role checks in many components (e.g. `role === 'Admin'`).
- `department` and `team` are plain text strings, prone to typos and lack referential integrity.
- `AuthContext.tsx` fallback explicitly bypasses permission checks for Counselors in "Lead Management".

## 15. Conflicting Legacy Role Systems
- `user.role === 'Admin'` vs `user.is_platform_super_admin`.
- Some components check `isAdmin` via arrays, some check specific text literals.

## 16. Tables That Must Be Modified
- `users`: drop text `department`, add `domain_id`.
- `roles`: add `domain_id` (optional, or rely on mapping).
- `audit_logs`: needs creation (superseding or extending `permission_logs`).
- `leads`, `tasks`, `calls`, `lead_assignments`: check FK constraints (`RESTRICT` instead of `CASCADE` / `SET NULL`).

## 17. Files That Must Be Modified
- `src/contexts/AuthContext.tsx` (centralize role checks, remove hardcoding).
- Routing components (add proper route guards).
- All components using hardcoded `role === 'X'` (replace with `hasPermission` or domain-aware checks).
- `supabase/migrations/*` (create new migration for domain + audit).

## 18. Files That Must NOT Be Modified
- Legacy `lead_activities` triggers unless absolutely necessary.
- Core UI components that don't enforce auth.
- Any working external integrations.

## 19. Migration Dependencies
- The new `domains` table must be created before updating `users`.
- Existing `department` text must be migrated safely to `domains` records.

## 20. Backward-Compatibility Risks
- Migrating `department` (text) to `domain_id` (UUID) could break queries relying on the text column.
- Changing `roles` to be domain-scoped might invalidate existing user roles if not mapped carefully.
- Removing hardcoded `role === 'Admin'` might lock out users if permissions are not properly seeded.
