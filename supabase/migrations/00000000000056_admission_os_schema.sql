-- ============================================================
-- Admission OS Schema Extension
-- ============================================================

-- 1. AI Pipeline Snapshots (cached view of every lead's pipeline position)
CREATE TABLE IF NOT EXISTS ai_pipeline_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
    pipeline_stage TEXT NOT NULL DEFAULT 'New Lead',
    owner_id UUID REFERENCES users(id),
    owner_name TEXT,
    waiting_hours INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    next_action TEXT,
    admission_probability DECIMAL(5,2) DEFAULT 0,
    dropout_probability DECIMAL(5,2) DEFAULT 0,
    payment_probability DECIMAL(5,2) DEFAULT 0,
    followup_urgency TEXT DEFAULT 'Normal' CHECK (followup_urgency IN ('Low', 'Normal', 'High', 'Critical')),
    best_university TEXT,
    expected_revenue DECIMAL(12,2) DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_lead ON ai_pipeline_snapshots(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON ai_pipeline_snapshots(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_risk ON ai_pipeline_snapshots(risk_level);
CREATE INDEX IF NOT EXISTS idx_pipeline_owner ON ai_pipeline_snapshots(owner_id);

-- 2. AI Daily Missions
CREATE TABLE IF NOT EXISTS ai_daily_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    role_type TEXT NOT NULL,
    missions JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_user ON ai_daily_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_date ON ai_daily_missions(mission_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_user_date ON ai_daily_missions(user_id, mission_date);

-- 3. AI Risk Alerts
CREATE TABLE IF NOT EXISTS ai_risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    entity_name TEXT,
    suggested_action TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Acknowledged', 'Resolved', 'Dismissed')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_status ON ai_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_risk_severity ON ai_risk_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_risk_entity ON ai_risk_alerts(entity_type, entity_id);

-- 4. Expand ai_audit_logs for Admission OS
ALTER TABLE ai_audit_logs
    ADD COLUMN IF NOT EXISTS prompt TEXT,
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS decision TEXT,
    ADD COLUMN IF NOT EXISTS affected_records JSONB,
    ADD COLUMN IF NOT EXISTS execution_result TEXT;

-- 5. RLS Policies
ALTER TABLE ai_pipeline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_risk_alerts ENABLE ROW LEVEL SECURITY;

-- Pipeline snapshots: counselors see their leads, admins see all
CREATE POLICY "pipeline_select_policy" ON ai_pipeline_snapshots
    FOR SELECT USING (
        owner_id = auth.uid() OR
        public.user_role() IN ('Admin', 'Super Admin')
    );

CREATE POLICY "pipeline_all_admin" ON ai_pipeline_snapshots
    FOR ALL USING (
        public.user_role() IN ('Admin', 'Super Admin')
    );

-- Daily missions: users see their own missions
CREATE POLICY "missions_own" ON ai_daily_missions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "missions_admin" ON ai_daily_missions
    FOR ALL USING (
        public.user_role() IN ('Admin', 'Super Admin')
    );

-- Risk alerts: admins and managers
CREATE POLICY "risk_select" ON ai_risk_alerts
    FOR SELECT USING (
        public.user_role() IN ('Admin', 'Super Admin', 'Counselor')
    );

CREATE POLICY "risk_manage" ON ai_risk_alerts
    FOR ALL USING (
        public.user_role() IN ('Admin', 'Super Admin')
    );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION handle_updated_at_generic()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER set_pipeline_updated_at BEFORE UPDATE ON ai_pipeline_snapshots
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at_generic();

CREATE TRIGGER set_missions_updated_at BEFORE UPDATE ON ai_daily_missions
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at_generic();
