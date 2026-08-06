-- Migration: AI Recommendation Engine 2.0 Extensions

-- 1. Extend universities table
ALTER TABLE universities
  ADD COLUMN IF NOT EXISTS ugc_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deb_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS naac_grade TEXT,
  ADD COLUMN IF NOT EXISTS nirf_ranking INTEGER,
  ADD COLUMN IF NOT EXISTS qs_ranking INTEGER,
  ADD COLUMN IF NOT EXISTS accreditations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scholarships JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS emi_options JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS admission_process TEXT,
  ADD COLUMN IF NOT EXISTS eligibility TEXT,
  ADD COLUMN IF NOT EXISTS placement_support BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS average_salary DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS corporate_tieups JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_platform TEXT,
  ADD COLUMN IF NOT EXISTS exam_pattern TEXT,
  ADD COLUMN IF NOT EXISTS duration_months INTEGER,
  ADD COLUMN IF NOT EXISTS student_reviews JSONB DEFAULT '[]'::jsonb;

-- 2. Extend leads table for detailed profiling
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS graduation_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS twelfth_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS tenth_percentage DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS current_occupation TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS annual_income DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS preferred_specialization TEXT,
  ADD COLUMN IF NOT EXISTS preferred_learning_mode TEXT,
  ADD COLUMN IF NOT EXISTS career_goal TEXT,
  ADD COLUMN IF NOT EXISTS need_placement_support BOOLEAN,
  ADD COLUMN IF NOT EXISTS need_scholarship BOOLEAN,
  ADD COLUMN IF NOT EXISTS need_emi BOOLEAN,
  ADD COLUMN IF NOT EXISTS preferred_intake TEXT;

-- 3. Create ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    generated_by UUID REFERENCES users(id),
    universities_recommended JSONB NOT NULL DEFAULT '[]'::jsonb,
    counselor_notes JSONB,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    selected_university_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_rec_lead_id ON ai_recommendations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_rec_generated_by ON ai_recommendations(generated_by);
CREATE INDEX IF NOT EXISTS idx_ai_rec_status ON ai_recommendations(status);

-- RLS Policies for ai_recommendations
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recommendations for their leads"
  ON ai_recommendations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = ai_recommendations.lead_id
      AND (
        l.assigned_counselor = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin')
      )
    )
  );

CREATE POLICY "Users can insert recommendations"
  ON ai_recommendations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their recommendations"
  ON ai_recommendations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = ai_recommendations.lead_id
      AND (
        l.assigned_counselor = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin')
      )
    )
  );

-- Function to handle ai_recommendations updated_at
CREATE OR REPLACE FUNCTION handle_ai_rec_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_ai_rec_updated_at
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION handle_ai_rec_updated_at();

-- Dummy data backfill for existing universities (just to ensure AI has something to work with)
UPDATE universities 
SET 
  naac_grade = 'A+',
  nirf_ranking = floor(random() * 100 + 1)::int,
  average_salary = 600000 + (random() * 400000),
  admission_process = 'Merit based + Personal Interview',
  eligibility = 'Minimum 50% in Graduation',
  accreditations = '["AICTE", "UGC"]'::jsonb,
  scholarships = '[{"name": "Merit Scholarship", "amount": 50000, "criteria": ">80% in Grad"}]'::jsonb
WHERE naac_grade IS NULL;
