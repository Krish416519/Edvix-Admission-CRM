-- Allow Managers and Team Leaders to have full access to leads, 
-- similar to Admins and Super Admins, so they can see assigned leads.
DROP POLICY IF EXISTS "SuperAdmins and Admins can do everything on leads" ON public.leads;

CREATE POLICY "Admins Managers TLs can do everything on leads" ON public.leads
  FOR ALL
  USING (
    public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Team Leader')
  )
  WITH CHECK (
    public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Team Leader')
  );

-- Also ensure they have access to admissions and documents
DROP POLICY IF EXISTS "SuperAdmins and Admins can do everything on admissions" ON public.admissions;
CREATE POLICY "Admins Managers TLs can do everything on admissions" ON public.admissions
  FOR ALL
  USING (
    public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Team Leader')
  )
  WITH CHECK (
    public.user_role() IN ('Super Admin', 'Admin', 'Manager', 'Team Leader')
  );

-- Just to be safe, if a Counselor is assigned, the existing Counselor policy works perfectly.
