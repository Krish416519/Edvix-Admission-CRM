-- =============================================================================
-- 00000000000092_bi_command_center.sql
-- Step 31: Advanced Revenue, Funnel & BI Command Center
-- Tables, Materialized Views, and RPCs for Executive Analytics.
-- =============================================================================

--------------------------------------------------
-- STEP 1: TABLES FOR REPORTS & DASHBOARDS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bi_saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Contains metric, dimensions, filters, chart_type
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bi_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.bi_saved_reports(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL, -- 'Daily', 'Weekly', 'Monthly'
  recipient_emails TEXT[],
  recipient_roles TEXT[],
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bi_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT, -- To support default layouts by role
  layout_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.bi_saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saved reports" ON public.bi_saved_reports FOR SELECT USING (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "Users can manage own saved reports" ON public.bi_saved_reports FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Users can view scheduled reports" ON public.bi_scheduled_reports FOR SELECT USING (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "Users can manage own scheduled reports" ON public.bi_scheduled_reports FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Users can manage own layouts" ON public.bi_dashboard_layouts FOR ALL USING (user_id = auth.uid());

--------------------------------------------------
-- STEP 2: MATERIALIZED VIEWS (For Performance)
--------------------------------------------------

-- Funnel snapshots
DROP MATERIALIZED VIEW IF EXISTS public.mv_bi_funnel_analytics CASCADE;
CREATE MATERIALIZED VIEW public.mv_bi_funnel_analytics AS
  SELECT
    created_at::date AS snapshot_date,
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE lead_status != 'New') AS contacted,
    COUNT(*) FILTER (WHERE lead_status IN ('Qualified', 'Application Started', 'Admission Done', 'Interested', 'Follow Up')) AS qualified,
    COUNT(*) FILTER (WHERE lead_status IN ('Application Started', 'Admission Done')) AS applications,
    COUNT(DISTINCT admission_id) AS admissions,
    COUNT(DISTINCT (SELECT id FROM public.payments WHERE admission_id = a.id AND status = 'Paid')) AS payments
  FROM public.leads l
  LEFT JOIN public.admissions a ON a.lead_id = l.id
  GROUP BY created_at::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bi_funnel_date ON public.mv_bi_funnel_analytics(snapshot_date);

-- Revenue Cohorts
DROP MATERIALIZED VIEW IF EXISTS public.mv_bi_revenue_cohorts CASCADE;
CREATE MATERIALIZED VIEW public.mv_bi_revenue_cohorts AS
  SELECT
    DATE_TRUNC('month', l.created_at)::date AS cohort_month,
    COUNT(DISTINCT l.id) AS cohort_size,
    COUNT(DISTINCT a.id) AS cohort_admissions,
    COALESCE(SUM(p.net_amount), 0) AS cohort_revenue
  FROM public.leads l
  LEFT JOIN public.admissions a ON a.lead_id = l.id
  LEFT JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
  GROUP BY DATE_TRUNC('month', l.created_at)::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bi_cohorts_month ON public.mv_bi_revenue_cohorts(cohort_month);

-- Source/Campaign Analytics
DROP MATERIALIZED VIEW IF EXISTS public.mv_bi_source_campaign CASCADE;
CREATE MATERIALIZED VIEW public.mv_bi_source_campaign AS
  SELECT
    l.created_at::date AS snapshot_date,
    COALESCE(l.lead_source, 'Unknown') AS source,
    COALESCE(l.utm_campaign, 'None') AS campaign,
    COUNT(DISTINCT l.id) AS leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status IN ('Qualified', 'Application Started', 'Admission Done')) AS qualified,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status IN ('Application Started', 'Admission Done')) AS applications,
    COUNT(DISTINCT a.id) AS admissions,
    COALESCE(SUM(p.net_amount), 0) AS revenue
  FROM public.leads l
  LEFT JOIN public.admissions a ON a.lead_id = l.id
  LEFT JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
  GROUP BY l.created_at::date, l.lead_source, l.utm_campaign;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bi_source_campaign ON public.mv_bi_source_campaign(snapshot_date, source, campaign);

--------------------------------------------------
-- STEP 3: RPC FUNCTIONS FOR COMMAND CENTER
--------------------------------------------------

-- 3.1: Executive Summary
CREATE OR REPLACE FUNCTION public.get_bi_executive_summary(
  p_start_date DATE,
  p_end_date DATE,
  p_prev_start_date DATE,
  p_prev_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_curr_leads BIGINT;
  v_prev_leads BIGINT;
  v_curr_admissions BIGINT;
  v_prev_admissions BIGINT;
  v_curr_revenue NUMERIC;
  v_prev_revenue NUMERIC;
  v_curr_pending_revenue NUMERIC;
  v_prev_pending_revenue NUMERIC;
BEGIN
  -- Current Period
  SELECT COUNT(*) INTO v_curr_leads FROM public.leads WHERE created_at::date BETWEEN p_start_date AND p_end_date;
  SELECT COUNT(*) INTO v_curr_admissions FROM public.admissions WHERE created_at::date BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(net_amount), 0) INTO v_curr_revenue FROM public.payments WHERE status = 'Paid' AND payment_date BETWEEN p_start_date AND p_end_date;
  SELECT COALESCE(SUM(net_amount), 0) INTO v_curr_pending_revenue FROM public.payments WHERE status IN ('Pending', 'Partially Paid') AND payment_date BETWEEN p_start_date AND p_end_date;

  -- Previous Period
  SELECT COUNT(*) INTO v_prev_leads FROM public.leads WHERE created_at::date BETWEEN p_prev_start_date AND p_prev_end_date;
  SELECT COUNT(*) INTO v_prev_admissions FROM public.admissions WHERE created_at::date BETWEEN p_prev_start_date AND p_prev_end_date;
  SELECT COALESCE(SUM(net_amount), 0) INTO v_prev_revenue FROM public.payments WHERE status = 'Paid' AND payment_date BETWEEN p_prev_start_date AND p_prev_end_date;
  SELECT COALESCE(SUM(net_amount), 0) INTO v_prev_pending_revenue FROM public.payments WHERE status IN ('Pending', 'Partially Paid') AND payment_date BETWEEN p_prev_start_date AND p_prev_end_date;

  RETURN json_build_object(
    'current', json_build_object(
      'total_leads', v_curr_leads,
      'total_admissions', v_curr_admissions,
      'conversion_rate', CASE WHEN v_curr_leads > 0 THEN ROUND((v_curr_admissions::numeric / v_curr_leads::numeric) * 100, 2) ELSE 0 END,
      'revenue', v_curr_revenue,
      'pending_revenue', v_curr_pending_revenue,
      'avg_revenue_per_admission', CASE WHEN v_curr_admissions > 0 THEN ROUND(v_curr_revenue / v_curr_admissions, 2) ELSE 0 END
    ),
    'previous', json_build_object(
      'total_leads', v_prev_leads,
      'total_admissions', v_prev_admissions,
      'conversion_rate', CASE WHEN v_prev_leads > 0 THEN ROUND((v_prev_admissions::numeric / v_prev_leads::numeric) * 100, 2) ELSE 0 END,
      'revenue', v_prev_revenue,
      'pending_revenue', v_prev_pending_revenue
    ),
    'growth', json_build_object(
      'leads_pct', CASE WHEN v_prev_leads > 0 THEN ROUND(((v_curr_leads - v_prev_leads)::numeric / v_prev_leads::numeric) * 100, 2) ELSE NULL END,
      'admissions_pct', CASE WHEN v_prev_admissions > 0 THEN ROUND(((v_curr_admissions - v_prev_admissions)::numeric / v_prev_admissions::numeric) * 100, 2) ELSE NULL END,
      'revenue_pct', CASE WHEN v_prev_revenue > 0 THEN ROUND(((v_curr_revenue - v_prev_revenue) / v_prev_revenue) * 100, 2) ELSE NULL END
    )
  );
END;
$$;

-- 3.2: Funnel Leakage
CREATE OR REPLACE FUNCTION public.get_bi_funnel_leakage(p_start_date DATE, p_end_date DATE)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH funnel AS (
    SELECT 
      SUM(total_leads) AS leads,
      SUM(contacted) AS contacted,
      SUM(qualified) AS qualified,
      SUM(applications) AS applications,
      SUM(admissions) AS admissions,
      SUM(payments) AS payments
    FROM public.mv_bi_funnel_analytics
    WHERE snapshot_date BETWEEN p_start_date AND p_end_date
  )
  SELECT json_build_object(
    'leads', leads,
    'contacted', contacted,
    'qualified', qualified,
    'applications', applications,
    'admissions', admissions,
    'payments', payments,
    'drop_off', json_build_object(
      'lead_to_contact', CASE WHEN leads > 0 THEN 100 - ROUND((contacted::numeric / leads::numeric) * 100, 2) ELSE 0 END,
      'contact_to_qual', CASE WHEN contacted > 0 THEN 100 - ROUND((qualified::numeric / contacted::numeric) * 100, 2) ELSE 0 END,
      'qual_to_app', CASE WHEN qualified > 0 THEN 100 - ROUND((applications::numeric / qualified::numeric) * 100, 2) ELSE 0 END,
      'app_to_adm', CASE WHEN applications > 0 THEN 100 - ROUND((admissions::numeric / applications::numeric) * 100, 2) ELSE 0 END,
      'adm_to_pay', CASE WHEN admissions > 0 THEN 100 - ROUND((payments::numeric / admissions::numeric) * 100, 2) ELSE 0 END
    )
  ) FROM funnel;
$$;

-- 3.3: Revenue Forecast
CREATE OR REPLACE FUNCTION public.get_bi_revenue_forecast(p_days INT)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hist_conv_rate NUMERIC;
  v_hist_avg_rev NUMERIC;
  v_active_leads BIGINT;
  v_forecast_admissions INT;
  v_forecast_revenue NUMERIC;
BEGIN
  -- Historical 90-day averages
  SELECT 
    CASE WHEN COUNT(id) > 0 THEN 
      (SELECT COUNT(id) FROM public.admissions WHERE created_at > CURRENT_DATE - INTERVAL '90 days')::numeric / COUNT(id)::numeric
    ELSE 0.05 END
  INTO v_hist_conv_rate
  FROM public.leads WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

  SELECT COALESCE(AVG(net_amount), 10000) INTO v_hist_avg_rev
  FROM public.payments WHERE status = 'Paid' AND payment_date > CURRENT_DATE - INTERVAL '90 days';

  -- Active pipeline sizing (Not lost/done)
  SELECT COUNT(id) INTO v_active_leads
  FROM public.leads 
  WHERE lead_status NOT IN ('Lost', 'Junk', 'Admission Done');

  v_forecast_admissions := ROUND(v_active_leads * v_hist_conv_rate * (p_days::numeric / 30.0));
  v_forecast_revenue := v_forecast_admissions * v_hist_avg_rev;

  RETURN json_build_object(
    'days', p_days,
    'expected_admissions', v_forecast_admissions,
    'expected_revenue', v_forecast_revenue,
    'historical_conversion_rate_pct', ROUND(v_hist_conv_rate * 100, 2),
    'historical_avg_revenue', ROUND(v_hist_avg_rev, 2)
  );
END;
$$;

-- 3.4: Anomaly Detection
CREATE OR REPLACE FUNCTION public.get_bi_anomaly_detection()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_7d_leads BIGINT;
  v_30d_avg_leads NUMERIC;
  v_7d_rev NUMERIC;
  v_30d_avg_rev NUMERIC;
  v_anomalies JSONB := '[]'::jsonb;
BEGIN
  SELECT COUNT(id) INTO v_7d_leads FROM public.leads WHERE created_at > CURRENT_DATE - INTERVAL '7 days';
  SELECT COUNT(id) / 4.28 INTO v_30d_avg_leads FROM public.leads WHERE created_at > CURRENT_DATE - INTERVAL '30 days';
  
  IF v_30d_avg_leads > 0 AND (v_7d_leads < v_30d_avg_leads * 0.7) THEN
    v_anomalies := v_anomalies || jsonb_build_object('metric', 'Leads', 'issue', 'Sudden Drop', 'severity', 'High', 'desc', 'Lead volume is 30% below 30-day average.');
  END IF;

  SELECT COALESCE(SUM(net_amount), 0) INTO v_7d_rev FROM public.payments WHERE status = 'Paid' AND payment_date > CURRENT_DATE - INTERVAL '7 days';
  SELECT COALESCE(SUM(net_amount), 0) / 4.28 INTO v_30d_avg_rev FROM public.payments WHERE status = 'Paid' AND payment_date > CURRENT_DATE - INTERVAL '30 days';

  IF v_30d_avg_rev > 0 AND (v_7d_rev < v_30d_avg_rev * 0.7) THEN
    v_anomalies := v_anomalies || jsonb_build_object('metric', 'Revenue', 'issue', 'Sudden Drop', 'severity', 'Critical', 'desc', 'Revenue is 30% below 30-day average.');
  END IF;

  RETURN json_build_object('anomalies', v_anomalies);
END;
$$;

-- 3.5: SLA Monitoring
CREATE OR REPLACE FUNCTION public.get_bi_sla_monitoring()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH new_lead_sla AS (
    SELECT COUNT(*) AS breached FROM public.leads WHERE lead_status = 'New' AND created_at < NOW() - INTERVAL '15 minutes'
  ),
  qual_lead_sla AS (
    SELECT COUNT(*) AS breached FROM public.leads WHERE lead_status = 'Qualified' AND updated_at < NOW() - INTERVAL '2 hours'
  ),
  pay_sla AS (
    SELECT COUNT(*) AS breached FROM public.payments WHERE status = 'Pending' AND created_at < NOW() - INTERVAL '24 hours'
  )
  SELECT json_build_object(
    'new_lead_breaches', (SELECT breached FROM new_lead_sla),
    'qualified_lead_breaches', (SELECT breached FROM qual_lead_sla),
    'payment_breaches', (SELECT breached FROM pay_sla)
  );
$$;

-- 3.6: At Risk Revenue
CREATE OR REPLACE FUNCTION public.get_bi_at_risk_revenue()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH stalled_payments AS (
    SELECT SUM(net_amount) AS amount, COUNT(*) AS count 
    FROM public.payments 
    WHERE status = 'Pending' AND created_at < NOW() - INTERVAL '7 days'
  ),
  stalled_admissions AS (
    SELECT COUNT(*) AS count
    FROM public.admissions
    WHERE current_stage = 'Fee Payment Pending' AND updated_at < NOW() - INTERVAL '7 days'
  )
  SELECT json_build_object(
    'stalled_pending_revenue', COALESCE((SELECT amount FROM stalled_payments), 0),
    'stalled_payment_count', (SELECT count FROM stalled_payments),
    'stalled_admission_count', (SELECT count FROM stalled_admissions)
  );
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_bi_executive_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_funnel_leakage TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_revenue_forecast TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_anomaly_detection TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_sla_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_at_risk_revenue TO authenticated;
