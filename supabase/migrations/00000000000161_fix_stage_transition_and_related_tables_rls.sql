-- 00000000000161_fix_stage_transition_and_related_tables_rls.sql
-- Fix log_stage_transition SECURITY DEFINER and align lead related tables (lead_activities, notes, documents) with RBAC data scope

-- 1. Fix log_stage_transition trigger function to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when lead_status actually changes
  IF OLD.lead_status IS DISTINCT FROM NEW.lead_status THEN
    INSERT INTO public.lead_activities (
      lead_id,
      type,
      content,
      author,
      date,
      organization_id
    ) VALUES (
      NEW.id,
      'status_change',
      'Stage Transition: ' || COALESCE(OLD.lead_status, 'None') || ' → ' || COALESCE(NEW.lead_status, 'None'),
      COALESCE(public.get_user_role_name(auth.uid()), 'System'),
      NOW(),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Ensure lead_activities has scoped policies for Counselors and Managers
DROP POLICY IF EXISTS "Managers and Counselors view accessible lead activities" ON public.lead_activities;
CREATE POLICY "Managers and Counselors view accessible lead activities" ON public.lead_activities
FOR SELECT USING (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);

DROP POLICY IF EXISTS "Managers and Counselors insert accessible lead activities" ON public.lead_activities;
CREATE POLICY "Managers and Counselors insert accessible lead activities" ON public.lead_activities
FOR INSERT WITH CHECK (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);

-- 3. Ensure notes has scoped policies for Counselors and Managers
DROP POLICY IF EXISTS "Managers and Counselors view accessible notes" ON public.notes;
CREATE POLICY "Managers and Counselors view accessible notes" ON public.notes
FOR SELECT USING (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);

DROP POLICY IF EXISTS "Managers and Counselors insert accessible notes" ON public.notes;
CREATE POLICY "Managers and Counselors insert accessible notes" ON public.notes
FOR INSERT WITH CHECK (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);

DROP POLICY IF EXISTS "Managers and Counselors update accessible notes" ON public.notes;
CREATE POLICY "Managers and Counselors update accessible notes" ON public.notes
FOR UPDATE USING (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
  )
);

-- 4. Ensure documents has scoped policies for Counselors and Managers
DROP POLICY IF EXISTS "Managers and Counselors view accessible documents" ON public.documents;
CREATE POLICY "Managers and Counselors view accessible documents" ON public.documents
FOR SELECT USING (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);

DROP POLICY IF EXISTS "Managers and Counselors insert accessible documents" ON public.documents;
CREATE POLICY "Managers and Counselors insert accessible documents" ON public.documents
FOR INSERT WITH CHECK (
  is_super_admin()
  OR is_admin()
  OR lead_id IN (
    SELECT id FROM public.leads
    WHERE assigned_counselor = auth.uid()
       OR is_manager_of(assigned_counselor)
       OR (user_role() = 'Counselor' AND assigned_counselor IS NULL)
  )
);
