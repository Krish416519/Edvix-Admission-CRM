-- 00000000000106_counseling_os_schema.sql

-- 1. Extend Leads Table for 360 Degree Academic, Professional, and Admission Profile
ALTER TABLE public.leads
  -- Academic Profile additions
  ADD COLUMN IF NOT EXISTS tenth_board TEXT,
  ADD COLUMN IF NOT EXISTS tenth_passing_year INTEGER,
  ADD COLUMN IF NOT EXISTS twelfth_board TEXT,
  ADD COLUMN IF NOT EXISTS twelfth_stream TEXT,
  ADD COLUMN IF NOT EXISTS twelfth_passing_year INTEGER,
  ADD COLUMN IF NOT EXISTS graduation_degree TEXT,
  ADD COLUMN IF NOT EXISTS graduation_university TEXT,
  ADD COLUMN IF NOT EXISTS graduation_passing_year INTEGER,
  ADD COLUMN IF NOT EXISTS graduation_backlogs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS graduation_mode TEXT,
  ADD COLUMN IF NOT EXISTS post_graduation_degree TEXT,
  ADD COLUMN IF NOT EXISTS post_graduation_university TEXT,
  ADD COLUMN IF NOT EXISTS post_graduation_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS post_graduation_passing_year INTEGER,
  ADD COLUMN IF NOT EXISTS gap_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_explanation TEXT,
  
  -- Professional Profile additions (others like industry, annual_income, current_occupation exist)
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS employment_status TEXT,

  -- Admission Profile additions
  ADD COLUMN IF NOT EXISTS target_role TEXT,
  ADD COLUMN IF NOT EXISTS motivation TEXT,
  ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('Low', 'Medium', 'High', 'Immediate')),
  ADD COLUMN IF NOT EXISTS university_brand_preference TEXT,
  
  -- Dispositions missing fields
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS competitor TEXT;


-- 2. Create Objection Management Table
CREATE TABLE IF NOT EXISTS public.lead_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    objection_type TEXT NOT NULL,
    student_concern TEXT,
    counselor_response TEXT,
    outcome TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Partially Resolved', 'Resolved')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_objections_lead_id ON public.lead_objections(lead_id);

-- RLS for lead_objections
ALTER TABLE public.lead_objections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to lead_objections" ON public.lead_objections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
        l.assigned_counselor = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Allow write access to lead_objections" ON public.lead_objections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
        l.assigned_counselor = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin', 'Manager')
      )
    )
  );

CREATE POLICY "Allow update access to lead_objections" ON public.lead_objections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leads l WHERE l.id = lead_objections.lead_id AND (
        l.assigned_counselor = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin', 'Manager')
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_lead_objections_updated_at
  BEFORE UPDATE ON public.lead_objections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Update Dispositions Seed Data for B2C Academic Counseling
DO $$
DECLARE
    cat_objection UUID;
    disp_fee_objection UUID := gen_random_uuid();
    disp_brand_objection UUID := gen_random_uuid();
    disp_parent_approval UUID := gen_random_uuid();
    cat_lost UUID;
    disp_lost UUID;
BEGIN
    SELECT id INTO cat_objection FROM public.disposition_categories WHERE name = 'OBJECTION / BARRIER' LIMIT 1;
    SELECT id INTO cat_lost FROM public.disposition_categories WHERE name = 'LOST / CLOSED' LIMIT 1;
    SELECT id INTO disp_lost FROM public.dispositions WHERE name = 'Lost' AND category_id = cat_lost LIMIT 1;

    IF cat_objection IS NOT NULL THEN
        INSERT INTO public.dispositions (id, category_id, name, requires_follow_up, requires_note, target_status, order_index) VALUES
        (disp_fee_objection, cat_objection, 'Fee Issue', true, true, 'Interested', 30),
        (disp_brand_objection, cat_objection, 'Comparing Universities', true, true, 'Interested', 40),
        (disp_parent_approval, cat_objection, 'Parent Approval Pending', true, true, 'Interested', 50)
        ON CONFLICT DO NOTHING;
    END IF;

    IF disp_lost IS NOT NULL THEN
        -- Add detailed lost reasons
        INSERT INTO public.sub_dispositions (disposition_id, name, order_index) VALUES
        (disp_lost, 'Budget Issue', 40),
        (disp_lost, 'Eligibility Issue', 50),
        (disp_lost, 'Chose Offline Program', 60),
        (disp_lost, 'Duplicate Lead', 70)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
