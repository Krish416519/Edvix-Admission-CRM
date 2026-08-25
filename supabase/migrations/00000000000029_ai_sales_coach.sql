-- 00000000000029_ai_sales_coach.sql
-- Migration for Step 29: AI Sales Coach & Counselor Intelligence

--------------------------------------------------
-- 1. EXTEND LEADS TABLE
--------------------------------------------------

-- Add new AI fields to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS ai_priority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_priority_reason TEXT,
ADD COLUMN IF NOT EXISTS ai_drop_off_risk VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_objection_detected TEXT,
ADD COLUMN IF NOT EXISTS ai_coach_notes TEXT;

--------------------------------------------------
-- 2. NEW TABLES FOR AI INTELLIGENCE
--------------------------------------------------

-- Counselor Performance
CREATE TABLE IF NOT EXISTS public.counselor_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counselor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL DEFAULT 0,
    contact_rate_percent INTEGER DEFAULT 0,
    conversion_rate_percent INTEGER DEFAULT 0,
    avg_response_time_mins INTEGER DEFAULT 0,
    ai_strengths TEXT,
    ai_improvements TEXT,
    ai_recommendation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(counselor_id, date)
);

-- AI Objection Library
CREATE TABLE IF NOT EXISTS public.ai_objection_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    objection_text TEXT NOT NULL,
    suggested_response TEXT NOT NULL,
    success_rate_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Feedback
CREATE TABLE IF NOT EXISTS public.ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counselor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL,
    recommendation_text TEXT NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    feedback_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Manager Alerts
CREATE TABLE IF NOT EXISTS public.ai_manager_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium',
    counselor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------
-- 3. TRIGGERS
--------------------------------------------------

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS set_updated_at_counselor_performance ON public.counselor_performance;
CREATE TRIGGER set_updated_at_counselor_performance BEFORE UPDATE ON public.counselor_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_ai_objection_library ON public.ai_objection_library;
CREATE TRIGGER set_updated_at_ai_objection_library BEFORE UPDATE ON public.ai_objection_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_ai_manager_alerts ON public.ai_manager_alerts;
CREATE TRIGGER set_updated_at_ai_manager_alerts BEFORE UPDATE ON public.ai_manager_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------
-- 4. INDEXES
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_counselor_perf_counselor_id ON public.counselor_performance(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_perf_date ON public.counselor_performance(date);

CREATE INDEX IF NOT EXISTS idx_ai_objection_category ON public.ai_objection_library(category);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_counselor_id ON public.ai_feedback(counselor_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_lead_id ON public.ai_feedback(lead_id);

CREATE INDEX IF NOT EXISTS idx_ai_manager_alerts_counselor_id ON public.ai_manager_alerts(counselor_id);
CREATE INDEX IF NOT EXISTS idx_ai_manager_alerts_resolved ON public.ai_manager_alerts(is_resolved);

--------------------------------------------------
-- 5. INITIAL DATA (OBJECTIONS)
--------------------------------------------------

INSERT INTO public.ai_objection_library (category, objection_text, suggested_response) VALUES
('Finance', 'Fees are too high compared to other colleges.', 'I understand budget is important. Did you know we offer merit-based scholarships and flexible EMI plans with 0% interest? Let me walk you through the breakdown.'),
('Decision', 'I need to discuss this with my parents/family.', 'Absolutely, involving your family is crucial. Would it be helpful if we schedule a quick joint session or if I send over a parent-focused brochure highlighting our ROI and placement records?'),
('Timing', 'I am not ready to apply right now, maybe next year.', 'That makes sense. Getting a head start on understanding the requirements is smart. Just to keep your options open, our current intake offers some early-bird advantages. Would you like to hear about them?'),
('Trust', 'I need a placement guarantee.', 'We don''t offer a "guarantee" because your success also depends on your hard work, but we do have a 92% placement rate, dedicated interview prep, and corporate tie-ups. Let me show you where our recent alumni are working.'),
('Competition', 'I am already speaking with another consultant/university.', 'It''s good to explore options! What specifically are you looking for in a university that the other consultant highlighted? I want to make sure you have all the facts about our unique offerings to make an informed decision.');
