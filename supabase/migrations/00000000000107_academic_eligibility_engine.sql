-- Migration 107: Academic Eligibility & Recommendation Engine Phase 2

-- 1. Program Eligibility Rules
CREATE TABLE IF NOT EXISTS program_eligibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    rule_group_name TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Draft', 'Archived')),
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_program_eligibility_rules_course_id ON program_eligibility_rules(course_id);
CREATE INDEX IF NOT EXISTS idx_program_eligibility_rules_university_id ON program_eligibility_rules(university_id);

-- 2. Program Fees
CREATE TABLE IF NOT EXISTS program_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    fee_category TEXT NOT NULL, -- 'Tuition', 'Application', 'Examination', 'Registration', etc.
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_program_fees_course_id ON program_fees(course_id);

-- 3. Scholarships
CREATE TABLE IF NOT EXISTS program_scholarships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    discount_amount NUMERIC(10, 2),
    discount_percentage NUMERIC(5, 2),
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_program_scholarships_uni_course ON program_scholarships(university_id, course_id);

-- 4. Extend ai_recommendations to include tracking and deterministic results
ALTER TABLE ai_recommendations 
ADD COLUMN IF NOT EXISTS eligibility_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS match_score NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS fee_estimate NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS counselor_decision TEXT, -- 'Approved', 'Rejected', 'Shortlisted', 'Manual Add'
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS rule_version INTEGER,
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- 5. RLS Policies
ALTER TABLE program_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_scholarships ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access to rules for authenticated users" 
ON program_eligibility_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to fees for authenticated users" 
ON program_fees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to scholarships for authenticated users" 
ON program_scholarships FOR SELECT TO authenticated USING (true);

-- Allow Admins and Super Admins to write (assuming roles are enforced via role_id or similar mechanism)
-- For this CRM, typically anyone authenticated can read, but write might be restricted.
-- Fallback policy: allow insert/update for admins (will use a simple check for demo)
CREATE POLICY "Allow all operations for admins on rules"
ON program_eligibility_rules FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND public.user_role() IN ('Super Admin', 'Admin')
  )
);

CREATE POLICY "Allow all operations for admins on fees"
ON program_fees FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND public.user_role() IN ('Super Admin', 'Admin')
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_program_eligibility_rules_updated_at') THEN
    CREATE TRIGGER trg_program_eligibility_rules_updated_at
    BEFORE UPDATE ON program_eligibility_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_program_fees_updated_at') THEN
    CREATE TRIGGER trg_program_fees_updated_at
    BEFORE UPDATE ON program_fees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_program_scholarships_updated_at') THEN
    CREATE TRIGGER trg_program_scholarships_updated_at
    BEFORE UPDATE ON program_scholarships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
