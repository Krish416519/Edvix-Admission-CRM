-- 00000000000110_ai_intelligence_layer.sql
-- AI Intelligence Layer - Core Tables for Step 39

-- AI Recommendations table (centralized recommendation feed)
DROP TABLE IF EXISTS ai_recommendations CASCADE;
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'lead_follow_up', 'lead_score_change', 'next_best_action',
    'student_at_risk', 'partner_opportunity', 'university_alert',
    'revenue_opportunity', 'anomaly_detected', 'data_quality',
    'conversion_opportunity'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('lead', 'student', 'partner', 'university', 'payment', 'admission')),
  entity_id UUID,
  entity_name TEXT,
  reason TEXT,
  evidence TEXT,
  suggested_action TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'accepted', 'rejected', 'snoozed', 'completed', 'expired')),
  owner_id UUID REFERENCES users(id),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- AI Anomalies table
CREATE TABLE IF NOT EXISTS ai_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'lead_spike', 'lead_drop', 'conversion_drop', 'payment_anomaly',
    'refund_spike', 'commission_anomaly', 'rejection_spike',
    'response_delay', 'partner_drop'
  )),
  type_label TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_range TEXT,
  actual_value TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Prompt Templates table
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  model TEXT,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  owner_id UUID REFERENCES users(id),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Model Configuration table
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_id UUID REFERENCES ai_model_configs(id),
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Cost Tracking table
CREATE TABLE IF NOT EXISTS ai_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10,6) NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Rate Limits table
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('user', 'role', 'organization', 'feature', 'api_key')),
  scope_id TEXT NOT NULL,
  requests_per_minute INTEGER NOT NULL DEFAULT 60,
  requests_per_hour INTEGER NOT NULL DEFAULT 500,
  requests_per_day INTEGER NOT NULL DEFAULT 5000,
  tokens_per_day INTEGER NOT NULL DEFAULT 100000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Knowledge Sources table
CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'university_info', 'program_info', 'admission_requirements',
    'internal_sop', 'crm_documentation', 'partner_policies',
    'counselor_sop', 'finance_policies'
  )),
  source_url TEXT,
  content TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  owner_id UUID REFERENCES users(id),
  organization_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Performance Metrics table
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  recommendation_acceptance_rate NUMERIC(5,2),
  recommendation_completion_rate NUMERIC(5,2),
  draft_approval_rate NUMERIC(5,2),
  error_rate NUMERIC(5,2),
  avg_response_latency_ms INTEGER,
  forecast_accuracy NUMERIC(5,2),
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_owner ON ai_recommendations(owner_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created ON ai_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_resolved ON ai_anomalies(resolved);
CREATE INDEX IF NOT EXISTS idx_ai_anomalies_detected ON ai_anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_created ON ai_cost_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_tracking_feature ON ai_cost_tracking(feature);

-- RLS Policies
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Recommendations: users can see their own or org-wide
CREATE POLICY "Users can view recommendations in their org"
  ON ai_recommendations FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

CREATE POLICY "System can insert recommendations"
  ON ai_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own recommendations"
  ON ai_recommendations FOR UPDATE
  USING (owner_id = auth.uid() OR owner_id IS NULL);

-- Anomalies: org-wide visibility
CREATE POLICY "Users can view anomalies in their org"
  ON ai_anomalies FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Prompt templates: org-wide
CREATE POLICY "Users can view prompt templates in their org"
  ON ai_prompt_templates FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Model configs: org-wide
CREATE POLICY "Users can view model configs in their org"
  ON ai_model_configs FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Cost tracking: org-wide
CREATE POLICY "Users can view cost tracking in their org"
  ON ai_cost_tracking FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Rate limits: org-wide
CREATE POLICY "Users can view rate limits in their org"
  ON ai_rate_limits FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Knowledge sources: org-wide
CREATE POLICY "Users can view knowledge sources in their org"
  ON ai_knowledge_sources FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));

-- Performance metrics: org-wide
CREATE POLICY "Users can view performance metrics in their org"
  ON ai_performance_metrics FOR SELECT
  USING (organization_id IS NULL OR organization_id = (current_setting('app.current_org_id', true)::UUID));
