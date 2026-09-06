-- 00000000000144_rbac_rls_policies.sql
-- Phase 16, 17, 18, 21: RLS and Domain Authority

-- Optimize RLS checks with stable functions to prevent recursion

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS BOOLEAN AS $$
  SELECT (public.get_user_role_name(auth.uid()) = 'Super Admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_domain_admin(p_domain_name VARCHAR) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    JOIN public.domains d ON u.domain_id = d.id
    WHERE u.id = auth.uid() 
    AND r.name LIKE '%Admin' 
    AND d.name = p_domain_name
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager_of(p_user_id UUID) RETURNS BOOLEAN AS $$
  -- Checks if the authenticated user is the manager of the given user
  SELECT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = p_user_id 
      AND (
          manager_id = auth.uid() OR
          team = (SELECT team FROM public.users WHERE id = auth.uid())
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. LEADS RLS
DROP POLICY IF EXISTS "Enable Read Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Update Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Delete Leads" ON public.leads;
DROP POLICY IF EXISTS "Enable Create Leads" ON public.leads;
DROP POLICY IF EXISTS "Admins Managers TLs can do everything on leads" ON public.leads;

CREATE POLICY "Enable Read Leads" ON public.leads FOR SELECT USING (
    public.is_super_admin() OR
    public.is_domain_admin('Admission') OR
    assigned_counselor = auth.uid() OR
    public.is_manager_of(assigned_counselor)
);

CREATE POLICY "Enable Update Leads" ON public.leads FOR UPDATE USING (
    public.is_super_admin() OR
    public.is_domain_admin('Admission') OR
    assigned_counselor = auth.uid() OR
    public.is_manager_of(assigned_counselor)
);

CREATE POLICY "Enable Create Leads" ON public.leads FOR INSERT WITH CHECK (
    public.is_super_admin() OR
    public.is_domain_admin('Admission') OR
    public.get_user_role_name(auth.uid()) IN ('Admission Manager', 'Team Leader', 'Admission Executive', 'Counselor')
);

CREATE POLICY "Enable Delete Leads" ON public.leads FOR DELETE USING (
    public.is_super_admin()
);

-- 2. TASKS RLS
DROP POLICY IF EXISTS "Enable Select Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks are viewable by assigned user or admins" ON public.tasks;

CREATE POLICY "Enable Select Tasks" ON public.tasks FOR SELECT USING (
    public.is_super_admin() OR
    public.is_domain_admin('Admission') OR
    assigned_user = auth.uid() OR
    public.is_manager_of(assigned_user) OR
    created_by = auth.uid()
);

CREATE POLICY "Enable Update Tasks" ON public.tasks FOR UPDATE USING (
    public.is_super_admin() OR
    public.is_domain_admin('Admission') OR
    assigned_user = auth.uid() OR
    public.is_manager_of(assigned_user) OR
    created_by = auth.uid()
);

CREATE POLICY "Enable Create Tasks" ON public.tasks FOR INSERT WITH CHECK (
    true -- Generally users can create tasks, the UI will restrict who they can assign to
);

-- 3. USERS RLS (To prevent users from seeing other domains if restricted)
-- For this CRM, users usually need to see other users for assignments. 
-- We will allow reading all users for now, but restrict mutations.

DROP POLICY IF EXISTS "Users can read all users" ON public.users;
CREATE POLICY "Users can read all active users" ON public.users FOR SELECT USING (
    true -- Read access is globally needed for drop-downs
);

DROP POLICY IF EXISTS "Only Super Admin can update users" ON public.users;
CREATE POLICY "Only Super Admin can update users" ON public.users FOR UPDATE USING (
    public.is_super_admin()
);

CREATE POLICY "Only Super Admin can insert users" ON public.users FOR INSERT WITH CHECK (
    public.is_super_admin()
);

-- 4. DOMAINS AND ROLES
CREATE POLICY "Anyone can read domains" ON public.domains FOR SELECT USING (true);
CREATE POLICY "Anyone can read roles" ON public.roles FOR SELECT USING (true);
