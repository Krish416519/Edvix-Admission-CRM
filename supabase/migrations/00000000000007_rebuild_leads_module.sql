-- 00000000000007_rebuild_leads_module.sql

-- 1. Rename existing columns
ALTER TABLE public.leads RENAME COLUMN name TO first_name;
ALTER TABLE public.leads RENAME COLUMN source TO lead_source;
ALTER TABLE public.leads RENAME COLUMN status TO lead_status;
ALTER TABLE public.leads RENAME COLUMN counselor_id TO assigned_counselor;
ALTER TABLE public.leads RENAME COLUMN score TO lead_score;

-- 2. Add new columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_number VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(100),
  ADD COLUMN IF NOT EXISTS counseling_mode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admission_status VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Data Migration for Name split
-- Assume first word is first_name and the rest is last_name
UPDATE public.leads
SET 
  last_name = CASE 
                WHEN position(' ' in first_name) > 0 THEN substring(first_name from position(' ' in first_name) + 1)
                ELSE ''
              END,
  first_name = CASE 
                 WHEN position(' ' in first_name) > 0 THEN substring(first_name from 1 for position(' ' in first_name) - 1)
                 ELSE first_name
               END
WHERE last_name IS NULL;

-- 4. Sequence & Trigger for Auto-Generated Lead Number
CREATE SEQUENCE IF NOT EXISTS lead_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  seq_val TEXT;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  seq_val := lpad(nextval('lead_number_seq')::text, 6, '0');
  NEW.lead_number := 'EDX-' || current_year || '-' || seq_val;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lead_insert_generate_number
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  WHEN (NEW.lead_number IS NULL)
  EXECUTE PROCEDURE generate_lead_number();

-- Update existing rows to have lead numbers
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.leads WHERE lead_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.leads 
    SET lead_number = 'EDX-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('lead_number_seq')::text, 6, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.leads ALTER COLUMN lead_number SET NOT NULL;

-- 5. Trigger for Activity Logging
CREATE OR REPLACE FUNCTION log_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
  author_name VARCHAR;
  activity_type VARCHAR;
  activity_content TEXT;
BEGIN
  -- Get author name
  SELECT name INTO author_name FROM public.users WHERE id = auth.uid();
  IF author_name IS NULL THEN
    author_name := 'System';
  END IF;

  IF TG_OP = 'INSERT' THEN
    activity_type := 'lead_created';
    activity_content := 'Lead was created in the system.';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      activity_type := 'status_change';
      activity_content := 'Lead was deleted (soft delete).';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      activity_type := 'status_change';
      activity_content := 'Lead was restored.';
    ELSIF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor THEN
      activity_type := 'status_change';
      activity_content := 'Lead counselor was changed.';
    ELSIF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
      activity_type := 'status_change';
      activity_content := 'Lead status changed from ' || OLD.lead_status || ' to ' || NEW.lead_status;
    ELSE
      activity_type := 'status_change';
      activity_content := 'Lead information was updated.';
    END IF;
  END IF;

  INSERT INTO public.lead_activities (lead_id, type, content, author)
  VALUES (NEW.id, activity_type, activity_content, author_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_changes_log_activity
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE PROCEDURE log_lead_activity();

-- 6. Updated By Trigger
CREATE OR REPLACE FUNCTION update_updated_by_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_by_leads 
  BEFORE UPDATE ON public.leads 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_by_column();

-- 7. RLS Policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Leads visible to all authenticated users temporarily" ON public.leads;

-- Super Admins & Admins can do everything
CREATE POLICY "SuperAdmins and Admins can do everything on leads" ON public.leads
  FOR ALL
  USING (
    public.user_role() IN ('Super Admin', 'Admin')
  )
  WITH CHECK (
    public.user_role() IN ('Super Admin', 'Admin')
  );

-- Counselors can only select leads assigned to them, or if no one is assigned yet (pool)
CREATE POLICY "Counselors can view their leads" ON public.leads
  FOR SELECT
  USING (
    public.user_role() = 'Counselor' AND 
    (assigned_counselor = auth.uid() OR assigned_counselor IS NULL)
  );

-- Counselors can only update their leads
CREATE POLICY "Counselors can update their leads" ON public.leads
  FOR UPDATE
  USING (
    public.user_role() = 'Counselor' AND 
    (assigned_counselor = auth.uid() OR assigned_counselor IS NULL)
  )
  WITH CHECK (
    public.user_role() = 'Counselor' AND 
    (assigned_counselor = auth.uid() OR assigned_counselor IS NULL)
  );

-- Anyone authenticated can insert a lead (e.g. creating their own or assigning it)
CREATE POLICY "Authenticated users can insert leads" ON public.leads
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
