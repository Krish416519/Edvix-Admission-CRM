-- =============================================================================
-- 00000000000015_analytics_module.sql
-- Comprehensive Reports & Business Intelligence for Edvix AI CRM
-- Fixes stale column references; adds expanded RPC functions for all modules.
-- =============================================================================

--------------------------------------------------
-- STEP 1: DROP OLD ANALYTICS FUNCTIONS
-- Re-create everything fresh to fix stale schema refs.
--------------------------------------------------

DROP FUNCTION IF EXISTS public.get_analytics_kpis() CASCADE;
DROP FUNCTION IF EXISTS public.get_admissions_pipeline() CASCADE;
DROP FUNCTION IF EXISTS public.get_lead_source_breakdown() CASCADE;
DROP FUNCTION IF EXISTS public.get_university_performance() CASCADE;
DROP FUNCTION IF EXISTS public.get_course_performance() CASCADE;
DROP FUNCTION IF EXISTS public.get_counselor_performance() CASCADE;
DROP FUNCTION IF EXISTS public.get_conversion_funnel() CASCADE;
DROP FUNCTION IF EXISTS public.get_weekly_trend() CASCADE;

--------------------------------------------------
-- STEP 2: MATERIALIZED VIEW — fast daily aggregation
--------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS public.mv_lead_daily_counts CASCADE;
CREATE MATERIALIZED VIEW public.mv_lead_daily_counts AS
  SELECT
    created_at::date AS day,
    COUNT(*) AS lead_count
  FROM public.leads
  GROUP BY created_at::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lead_daily ON public.mv_lead_daily_counts(day);

DROP MATERIALIZED VIEW IF EXISTS public.mv_payment_monthly CASCADE;
CREATE MATERIALIZED VIEW public.mv_payment_monthly AS
  SELECT
    DATE_TRUNC('month', payment_date)::date AS month,
    SUM(net_amount) AS revenue,
    COUNT(*) AS payment_count
  FROM public.payments
  WHERE status = 'Paid' AND payment_date IS NOT NULL
  GROUP BY DATE_TRUNC('month', payment_date)::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_payment_monthly ON public.mv_payment_monthly(month);

--------------------------------------------------
-- STEP 3: HELPER FUNCTION — role check for analytics RLS
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_view_all_analytics()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin() OR public.user_role() IN ('Admin', 'Super Admin', 'Accounts');
$$;

--------------------------------------------------
-- STEP 4: CORE KPI FUNCTION (fixed for new schema)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_analytics_kpis(
  p_start_date DATE DEFAULT NULL,
  p_end_date   DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_start DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end   DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
  RETURN json_build_object(
    -- Leads
    'total_leads',          (SELECT COUNT(*) FROM public.leads WHERE created_at::date BETWEEN v_start AND v_end),
    'today_leads',          (SELECT COUNT(*) FROM public.leads WHERE created_at::date = CURRENT_DATE),
    'active_leads',         (SELECT COUNT(*) FROM public.leads WHERE lead_status NOT IN ('Junk', 'Lost', 'Admission Done')),
    'qualified_leads',      (SELECT COUNT(*) FROM public.leads WHERE lead_status IN ('Interested', 'Follow Up', 'Application Started')),
    -- Admissions
    'total_admissions',     (SELECT COUNT(*) FROM public.admissions WHERE created_at::date BETWEEN v_start AND v_end),
    'completed_admissions', (SELECT COUNT(*) FROM public.admissions WHERE current_stage = 'Admission Completed'),
    'pending_admissions',   (SELECT COUNT(*) FROM public.admissions WHERE admission_status = 'Active' AND current_stage != 'Admission Completed'),
    -- Conversion
    'conversion_rate', CASE
      WHEN (SELECT COUNT(*) FROM public.leads) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*) FROM public.admissions WHERE current_stage = 'Admission Completed')::numeric
        / NULLIF((SELECT COUNT(*) FROM public.leads), 0)::numeric * 100, 1)
      END,
    -- Finance (uses new net_amount column)
    'revenue_this_month',   COALESCE((
      SELECT SUM(net_amount) FROM public.payments
      WHERE status = 'Paid' AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0),
    'pending_revenue',      COALESCE((
      SELECT SUM(net_amount) FROM public.payments WHERE status IN ('Pending', 'Partially Paid')
    ), 0),
    'total_revenue',        COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status = 'Paid'), 0),
    -- Tasks
    'tasks_overdue',        (SELECT COUNT(*) FROM public.tasks WHERE status = 'Pending' AND due_date < NOW()),
    'tasks_completed',      (SELECT COUNT(*) FROM public.tasks WHERE status = 'Completed' AND updated_at::date BETWEEN v_start AND v_end)
  );
END;
$$;

--------------------------------------------------
-- STEP 5: ADMISSIONS PIPELINE (fixed current_stage)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admissions_pipeline()
RETURNS TABLE(stage TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(current_stage, 'Unknown') AS stage,
    COUNT(*)::bigint AS count
  FROM public.admissions
  GROUP BY current_stage
  ORDER BY count DESC;
$$;

--------------------------------------------------
-- STEP 6: LEAD SOURCE BREAKDOWN (fixed lead_source)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_lead_source_breakdown()
RETURNS TABLE(name TEXT, value BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(lead_source, 'Direct') AS name,
    COUNT(*)::bigint AS value
  FROM public.leads
  GROUP BY lead_source
  ORDER BY value DESC;
$$;

--------------------------------------------------
-- STEP 7: UNIVERSITY PERFORMANCE
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_university_performance()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT, revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH lead_counts AS (
    SELECT u.name AS university_name, COUNT(l.id)::bigint AS lead_count
    FROM public.universities u
    LEFT JOIN public.leads l ON l.university_id = u.id
    GROUP BY u.id, u.name
  ),
  admission_counts AS (
    SELECT u.name AS university_name, COUNT(a.id)::bigint AS admission_count
    FROM public.universities u
    LEFT JOIN public.admissions a ON a.university_id = u.id
    GROUP BY u.id, u.name
  ),
  revenue_counts AS (
    SELECT u.name AS university_name, COALESCE(SUM(p.net_amount), 0) AS rev
    FROM public.universities u
    LEFT JOIN public.admissions a ON a.university_id = u.id
    LEFT JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
    GROUP BY u.id, u.name
  )
  SELECT
    lc.university_name AS name,
    COALESCE(lc.lead_count, 0) AS leads,
    COALESCE(ac.admission_count, 0) AS admissions,
    COALESCE(rc.rev, 0) AS revenue
  FROM lead_counts lc
  LEFT JOIN admission_counts ac ON ac.university_name = lc.university_name
  LEFT JOIN revenue_counts rc ON rc.university_name = lc.university_name
  ORDER BY leads DESC
  LIMIT 10;
$$;

--------------------------------------------------
-- STEP 8: COURSE PERFORMANCE
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_course_performance()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT, avg_fee NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH lead_counts AS (
    SELECT c.name AS course_name, COUNT(l.id)::bigint AS lead_count
    FROM public.courses c
    LEFT JOIN public.leads l ON l.course_id = c.id
    GROUP BY c.id, c.name
  ),
  admission_counts AS (
    SELECT c.name AS course_name, COUNT(a.id)::bigint AS admission_count,
           COALESCE(AVG(a.fee_structure), 0) AS avg_fee
    FROM public.courses c
    LEFT JOIN public.admissions a ON a.course_id = c.id
    GROUP BY c.id, c.name
  )
  SELECT
    lc.course_name AS name,
    COALESCE(lc.lead_count, 0) AS leads,
    COALESCE(ac.admission_count, 0) AS admissions,
    COALESCE(ac.avg_fee, 0) AS avg_fee
  FROM lead_counts lc
  LEFT JOIN admission_counts ac ON ac.course_name = lc.course_name
  ORDER BY leads DESC
  LIMIT 10;
$$;

--------------------------------------------------
-- STEP 9: COUNSELOR PERFORMANCE (fixed assigned_counselor)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_counselor_performance()
RETURNS TABLE(
  counselor_id UUID,
  name TEXT,
  assigned BIGINT,
  contacted BIGINT,
  converted BIGINT,
  revenue NUMERIC,
  tasks_completed BIGINT,
  tasks_overdue BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH lead_stats AS (
    SELECT
      u.id AS uid,
      u.name AS counselor_name,
      COUNT(l.id)::bigint AS assigned,
      COUNT(l.id) FILTER (WHERE l.lead_status != 'New')::bigint AS contacted,
      COUNT(l.id) FILTER (WHERE l.lead_status = 'Admission Done')::bigint AS converted
    FROM public.users u
    INNER JOIN public.leads l ON l.assigned_counselor = u.id
    GROUP BY u.id, u.name
  ),
  revenue_stats AS (
    SELECT
      u.id AS uid,
      COALESCE(SUM(p.net_amount), 0) AS revenue
    FROM public.users u
    INNER JOIN public.admissions a ON a.assigned_counselor = u.id
    INNER JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
    GROUP BY u.id
  ),
  task_stats AS (
    SELECT
      u.id AS uid,
      COUNT(t.id) FILTER (WHERE t.status = 'Completed')::bigint AS tasks_completed,
      COUNT(t.id) FILTER (WHERE t.status = 'Pending' AND t.due_date < NOW())::bigint AS tasks_overdue
    FROM public.users u
    LEFT JOIN public.tasks t ON t.assigned_user = u.id
    GROUP BY u.id
  )
  SELECT
    ls.uid AS counselor_id,
    ls.counselor_name AS name,
    ls.assigned,
    ls.contacted,
    ls.converted,
    COALESCE(rs.revenue, 0) AS revenue,
    COALESCE(ts.tasks_completed, 0) AS tasks_completed,
    COALESCE(ts.tasks_overdue, 0) AS tasks_overdue
  FROM lead_stats ls
  LEFT JOIN revenue_stats rs ON rs.uid = ls.uid
  LEFT JOIN task_stats ts ON ts.uid = ls.uid
  ORDER BY converted DESC
  LIMIT 10;
$$;

--------------------------------------------------
-- STEP 10: CONVERSION FUNNEL (fixed lead_status / current_stage)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_conversion_funnel()
RETURNS TABLE(name TEXT, value BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM (VALUES
    ('Total Leads',    (SELECT COUNT(*)::bigint FROM public.leads)),
    ('Contacted',      (SELECT COUNT(*)::bigint FROM public.leads WHERE lead_status != 'New')),
    ('Interested',     (SELECT COUNT(*)::bigint FROM public.leads WHERE lead_status IN ('Interested', 'Follow Up', 'Application Started', 'Admission Done'))),
    ('Applied',        (SELECT COUNT(*)::bigint FROM public.leads WHERE lead_status IN ('Application Started', 'Admission Done'))),
    ('Docs Verified',  (SELECT COUNT(*)::bigint FROM public.admissions WHERE current_stage IN ('University Verification', 'Fee Payment Pending', 'LMS Credentials Received', 'Admission Completed'))),
    ('Admission Done', (SELECT COUNT(*)::bigint FROM public.admissions WHERE current_stage = 'Admission Completed'))
  ) AS t(name, value);
$$;

--------------------------------------------------
-- STEP 11: WEEKLY TREND (fixed schema refs)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_weekly_trend()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH weeks AS (
    SELECT
      'Week ' || (gs.i + 1)::text AS week_name,
      (CURRENT_DATE - ((3 - gs.i) * 7 + 7) * INTERVAL '1 day')::date AS week_start,
      (CURRENT_DATE - ((3 - gs.i) * 7) * INTERVAL '1 day')::date AS week_end,
      gs.i AS idx
    FROM generate_series(0, 3) AS gs(i)
  ),
  lead_agg AS (
    SELECT w.idx, COUNT(l.id)::bigint AS lead_count
    FROM weeks w
    LEFT JOIN public.leads l ON l.created_at::date >= w.week_start AND l.created_at::date < w.week_end
    GROUP BY w.idx
  ),
  adm_agg AS (
    SELECT w.idx, COUNT(a.id)::bigint AS admission_count
    FROM weeks w
    LEFT JOIN public.admissions a ON a.created_at::date >= w.week_start AND a.created_at::date < w.week_end
    GROUP BY w.idx
  )
  SELECT
    w.week_name AS name,
    COALESCE(la.lead_count, 0) AS leads,
    COALESCE(aa.admission_count, 0) AS admissions
  FROM weeks w
  LEFT JOIN lead_agg la ON la.idx = w.idx
  LEFT JOIN adm_agg aa ON aa.idx = w.idx
  ORDER BY w.idx;
$$;

--------------------------------------------------
-- STEP 12: MONTHLY TREND (last 12 months)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_monthly_trend()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT, revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH months AS (
    SELECT
      TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - (gs.i || ' months')::INTERVAL), 'Mon YY') AS month_name,
      DATE_TRUNC('month', CURRENT_DATE - (gs.i || ' months')::INTERVAL) AS month_start,
      DATE_TRUNC('month', CURRENT_DATE - (gs.i || ' months')::INTERVAL) + INTERVAL '1 month' AS month_end,
      gs.i AS idx
    FROM generate_series(0, 11) AS gs(i)
  )
  SELECT
    m.month_name AS name,
    COUNT(DISTINCT l.id)::bigint AS leads,
    COUNT(DISTINCT a.id)::bigint AS admissions,
    COALESCE(SUM(p.net_amount), 0) AS revenue
  FROM months m
  LEFT JOIN public.leads l ON l.created_at >= m.month_start AND l.created_at < m.month_end
  LEFT JOIN public.admissions a ON a.created_at >= m.month_start AND a.created_at < m.month_end
  LEFT JOIN public.payments p ON p.payment_date >= m.month_start AND p.payment_date < m.month_end AND p.status = 'Paid'
  GROUP BY m.month_name, m.idx
  ORDER BY m.idx DESC;
$$;

--------------------------------------------------
-- STEP 13: FINANCE ANALYTICS
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_finance_analytics()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    -- Revenue
    'total_revenue',      COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status = 'Paid'), 0),
    'monthly_revenue',    COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status = 'Paid' AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)), 0),
    'yearly_revenue',     COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status = 'Paid' AND DATE_TRUNC('year', payment_date) = DATE_TRUNC('year', CURRENT_DATE)), 0),
    -- Outstanding
    'pending_payments',   COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status IN ('Pending', 'Partially Paid')), 0),
    'failed_payments',    COALESCE((SELECT SUM(net_amount) FROM public.payments WHERE status = 'Failed'), 0),
    -- Payouts & Commissions
    'pending_payouts',    COALESCE((SELECT SUM(pending_amount) FROM public.university_payouts WHERE payout_status = 'Pending'), 0),
    'paid_payouts',       COALESCE((SELECT SUM(received_amount) FROM public.university_payouts WHERE payout_status = 'Processed'), 0),
    'total_commissions',  COALESCE((SELECT SUM(net_commission) FROM public.commissions), 0),
    'pending_commissions',COALESCE((SELECT SUM(net_commission) FROM public.commissions WHERE status = 'Pending'), 0),
    -- Payment method distribution
    'upi_count',          (SELECT COUNT(*) FROM public.payments WHERE payment_method = 'UPI'),
    'bank_transfer_count',(SELECT COUNT(*) FROM public.payments WHERE payment_method = 'Bank Transfer'),
    'card_count',         (SELECT COUNT(*) FROM public.payments WHERE payment_method IN ('Credit Card', 'Debit Card')),
    'cash_count',         (SELECT COUNT(*) FROM public.payments WHERE payment_method = 'Cash')
  );
END;
$$;

--------------------------------------------------
-- STEP 14: PAYMENT METHOD DISTRIBUTION
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_payment_method_distribution()
RETURNS TABLE(name TEXT, value BIGINT, amount NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    payment_method AS name,
    COUNT(*)::bigint AS value,
    COALESCE(SUM(net_amount), 0) AS amount
  FROM public.payments
  WHERE status = 'Paid'
  GROUP BY payment_method
  ORDER BY value DESC;
$$;

--------------------------------------------------
-- STEP 15: TASK ANALYTICS
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_task_analytics()
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'total_tasks',    (SELECT COUNT(*) FROM public.tasks),
    'completed',      (SELECT COUNT(*) FROM public.tasks WHERE status = 'Completed'),
    'pending',        (SELECT COUNT(*) FROM public.tasks WHERE status = 'Pending'),
    'overdue',        (SELECT COUNT(*) FROM public.tasks WHERE status = 'Pending' AND due_date < NOW()),
    'created_today',  (SELECT COUNT(*) FROM public.tasks WHERE created_at::date = CURRENT_DATE),
    'avg_completion_hours', COALESCE((
      SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 3600
      FROM public.tasks WHERE status = 'Completed'
    ), 0)
  );
$$;

--------------------------------------------------
-- STEP 16: DAILY LEADS TREND (last 30 days)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_daily_leads_trend()
RETURNS TABLE(name TEXT, leads BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    TO_CHAR(d::date, 'DD Mon') AS name,
    COALESCE(COUNT(l.id), 0)::bigint AS leads
  FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day'::interval) AS d
  LEFT JOIN public.leads l ON l.created_at::date = d::date
  GROUP BY d
  ORDER BY d;
$$;

--------------------------------------------------
-- STEP 17: LEAD AGING REPORT
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_lead_aging_report()
RETURNS TABLE(bucket TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE
      WHEN CURRENT_DATE - created_at::date <= 7  THEN '0–7 days'
      WHEN CURRENT_DATE - created_at::date <= 30 THEN '8–30 days'
      WHEN CURRENT_DATE - created_at::date <= 90 THEN '31–90 days'
      ELSE '90+ days'
    END AS bucket,
    COUNT(*)::bigint AS count
  FROM public.leads
  WHERE lead_status NOT IN ('Admission Done', 'Junk', 'Lost')
  GROUP BY bucket
  ORDER BY MIN(created_at);
$$;

--------------------------------------------------
-- STEP 18: LEADS BY STATE
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_leads_by_state()
RETURNS TABLE(name TEXT, value BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(state, 'Unknown') AS name,
    COUNT(*)::bigint AS value
  FROM public.leads
  GROUP BY state
  ORDER BY value DESC
  LIMIT 15;
$$;

--------------------------------------------------
-- STEP 19: REFRESH MATERIALIZED VIEWS HELPER
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_lead_daily_counts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_payment_monthly;
END;
$$;

--------------------------------------------------
-- STEP 20: INDEXES FOR PERFORMANCE
--------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_leads_lead_status   ON public.leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source   ON public.leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_counselor     ON public.leads(assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_leads_state         ON public.leads(state);
CREATE INDEX IF NOT EXISTS idx_admissions_stage    ON public.admissions(current_stage);
CREATE INDEX IF NOT EXISTS idx_admissions_created  ON public.admissions(created_at);
CREATE INDEX IF NOT EXISTS idx_admissions_counselor ON public.admissions(assigned_counselor);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date        ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due            ON public.tasks(due_date);

--------------------------------------------------
-- STEP 21: GRANTS
--------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_analytics_kpis(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admissions_pipeline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_source_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_university_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_counselor_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finance_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_method_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_leads_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_aging_report() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leads_by_state() TO authenticated;
GRANT SELECT ON public.mv_lead_daily_counts TO authenticated;
GRANT SELECT ON public.mv_payment_monthly TO authenticated;
