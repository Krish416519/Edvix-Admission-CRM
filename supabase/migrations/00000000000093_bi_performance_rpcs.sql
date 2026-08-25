-- =============================================================================
-- 00000000000093_bi_performance_rpcs.sql
-- Step 31: Advanced Revenue, Funnel & BI Command Center
-- Performance RPCs with Date Filters
-- =============================================================================

-- Counselor Performance
CREATE OR REPLACE FUNCTION public.get_bi_counselor_performance(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(counselor_name TEXT, leads BIGINT, contacted BIGINT, qualified BIGINT, applications BIGINT, admissions BIGINT, payments BIGINT, revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(u.name, 'Unassigned') AS counselor_name,
    COUNT(DISTINCT l.id) AS leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status != 'New') AS contacted,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status IN ('Qualified', 'Application Started', 'Admission Done', 'Interested', 'Follow Up')) AS qualified,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status IN ('Application Started', 'Admission Done')) AS applications,
    COUNT(DISTINCT a.id) AS admissions,
    COUNT(DISTINCT (SELECT id FROM public.payments WHERE admission_id = a.id AND status = 'Paid')) AS payments,
    COALESCE(SUM(p.net_amount), 0) AS revenue
  FROM public.leads l
  LEFT JOIN public.users u ON l.assigned_counselor = u.id
  LEFT JOIN public.admissions a ON a.lead_id = l.id
  LEFT JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
  WHERE l.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY u.name
  ORDER BY revenue DESC;
$$;

-- Source Performance
CREATE OR REPLACE FUNCTION public.get_bi_source_performance(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(source_name TEXT, leads BIGINT, qualified BIGINT, admissions BIGINT, revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(l.lead_source, 'Unknown') AS source_name,
    COUNT(DISTINCT l.id) AS leads,
    COUNT(DISTINCT l.id) FILTER (WHERE l.lead_status IN ('Qualified', 'Application Started', 'Admission Done')) AS qualified,
    COUNT(DISTINCT a.id) AS admissions,
    COALESCE(SUM(p.net_amount), 0) AS revenue
  FROM public.leads l
  LEFT JOIN public.admissions a ON a.lead_id = l.id
  LEFT JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
  WHERE l.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY l.lead_source
  ORDER BY revenue DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bi_counselor_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bi_source_performance TO authenticated;
