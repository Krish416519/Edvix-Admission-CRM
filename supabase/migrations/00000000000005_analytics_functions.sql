-- 00000000000005_analytics_functions.sql
-- Server-side aggregation functions for the Analytics Dashboard.
-- Uses proper FK joins against the normalized schema.
-- All functions are SECURITY DEFINER with search_path = public for RLS safety.

--------------------------------------------------
-- 1. KPIs
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_analytics_kpis()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_leads',          (SELECT COUNT(*) FROM public.leads),
    'today_leads',          (SELECT COUNT(*) FROM public.leads WHERE created_at::date = CURRENT_DATE),
    'total_admissions',     (SELECT COUNT(*) FROM public.admissions),
    'completed_admissions', (SELECT COUNT(*) FROM public.admissions WHERE stage = 'Admission Completed'),
    'total_revenue',        COALESCE((SELECT SUM(final_amount) FROM public.payments WHERE status = 'Paid'), 0),
    'pending_revenue',      COALESCE((SELECT SUM(final_amount) FROM public.payments WHERE status IN ('Pending', 'Partially Paid')), 0),
    'conversion_rate',      CASE
                              WHEN (SELECT COUNT(*) FROM public.leads) = 0 THEN 0
                              ELSE ROUND(
                                (SELECT COUNT(*) FROM public.admissions WHERE stage = 'Admission Completed')::numeric
                                / (SELECT COUNT(*) FROM public.leads)::numeric * 100
                              )
                            END
  );
$$;

--------------------------------------------------
-- 2. Admissions Pipeline (count by stage)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admissions_pipeline()
RETURNS TABLE(stage TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(a.stage, 'Unknown') AS stage,
    COUNT(*)::bigint AS count
  FROM public.admissions a
  GROUP BY a.stage
  ORDER BY count DESC;
$$;

--------------------------------------------------
-- 3. Lead Source Breakdown
-- leads.source is a TEXT column - exists in schema
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_lead_source_breakdown()
RETURNS TABLE(name TEXT, value BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(l.source, 'Direct') AS name,
    COUNT(*)::bigint AS value
  FROM public.leads l
  GROUP BY l.source
  ORDER BY value DESC;
$$;

--------------------------------------------------
-- 4. University Performance
-- leads.university_id FK -> universities.name
-- admissions.university_id FK -> universities.name
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_university_performance()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lead_counts AS (
    SELECT
      u.name AS university_name,
      COUNT(l.id)::bigint AS lead_count
    FROM public.universities u
    LEFT JOIN public.leads l ON l.university_id = u.id
    GROUP BY u.id, u.name
  ),
  admission_counts AS (
    SELECT
      u.name AS university_name,
      COUNT(a.id)::bigint AS admission_count
    FROM public.universities u
    LEFT JOIN public.admissions a ON a.university_id = u.id
    GROUP BY u.id, u.name
  )
  SELECT
    lc.university_name AS name,
    COALESCE(lc.lead_count, 0) AS leads,
    COALESCE(ac.admission_count, 0) AS admissions
  FROM lead_counts lc
  LEFT JOIN admission_counts ac ON ac.university_name = lc.university_name
  ORDER BY leads DESC
  LIMIT 8;
$$;

--------------------------------------------------
-- 5. Course Performance
-- leads.course_id FK -> courses.name
-- admissions.course_id FK -> courses.name
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_course_performance()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lead_counts AS (
    SELECT
      c.name AS course_name,
      COUNT(l.id)::bigint AS lead_count
    FROM public.courses c
    LEFT JOIN public.leads l ON l.course_id = c.id
    GROUP BY c.id, c.name
  ),
  admission_counts AS (
    SELECT
      c.name AS course_name,
      COUNT(a.id)::bigint AS admission_count
    FROM public.courses c
    LEFT JOIN public.admissions a ON a.course_id = c.id
    GROUP BY c.id, c.name
  )
  SELECT
    lc.course_name AS name,
    COALESCE(lc.lead_count, 0) AS leads,
    COALESCE(ac.admission_count, 0) AS admissions
  FROM lead_counts lc
  LEFT JOIN admission_counts ac ON ac.course_name = lc.course_name
  ORDER BY leads DESC
  LIMIT 8;
$$;

--------------------------------------------------
-- 6. Counselor Performance
-- leads.counselor_id FK -> users.id
-- users.name is the display name column
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_counselor_performance()
RETURNS TABLE(
  name TEXT,
  assigned BIGINT,
  contacted BIGINT,
  converted BIGINT,
  revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lead_stats AS (
    SELECT
      u.name AS counselor_name,
      COUNT(l.id)::bigint AS assigned,
      COUNT(l.id) FILTER (WHERE l.status != 'New')::bigint AS contacted,
      COUNT(l.id) FILTER (WHERE l.status = 'Admission Done')::bigint AS converted
    FROM public.users u
    INNER JOIN public.leads l ON l.counselor_id = u.id
    GROUP BY u.id, u.name
  ),
  revenue_stats AS (
    SELECT
      u.name AS counselor_name,
      COALESCE(SUM(p.final_amount), 0) AS revenue
    FROM public.users u
    INNER JOIN public.admissions a ON a.counselor_id = u.id
    INNER JOIN public.payments p ON p.admission_id = a.id AND p.status = 'Paid'
    GROUP BY u.id, u.name
  )
  SELECT
    ls.counselor_name AS name,
    ls.assigned,
    ls.contacted,
    ls.converted,
    COALESCE(rs.revenue, 0) AS revenue
  FROM lead_stats ls
  LEFT JOIN revenue_stats rs ON rs.counselor_name = ls.counselor_name
  ORDER BY converted DESC
  LIMIT 10;
$$;

--------------------------------------------------
-- 7. Conversion Funnel
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_conversion_funnel()
RETURNS TABLE(name TEXT, value BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (VALUES
    ('Total Leads',    (SELECT COUNT(*)::bigint FROM public.leads)),
    ('Contacted',      (SELECT COUNT(*)::bigint FROM public.leads WHERE status != 'New')),
    ('Interested',     (SELECT COUNT(*)::bigint FROM public.leads WHERE status IN ('Interested', 'Follow Up', 'Application Started', 'Admission Done'))),
    ('Applied',        (SELECT COUNT(*)::bigint FROM public.leads WHERE status IN ('Application Started', 'Admission Done'))),
    ('Docs Verified',  (SELECT COUNT(*)::bigint FROM public.admissions WHERE stage IN ('University Verification', 'Fee Payment Pending', 'LMS Credentials Received', 'Admission Completed'))),
    ('Admission Done', (SELECT COUNT(*)::bigint FROM public.admissions WHERE stage = 'Admission Completed'))
  ) AS t(name, value);
$$;

--------------------------------------------------
-- 8. Weekly Trend (last 4 calendar weeks)
--------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_weekly_trend()
RETURNS TABLE(name TEXT, leads BIGINT, admissions BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
    SELECT
      w.idx,
      COUNT(l.id)::bigint AS lead_count
    FROM weeks w
    LEFT JOIN public.leads l
      ON l.created_at::date >= w.week_start
     AND l.created_at::date < w.week_end
    GROUP BY w.idx
  ),
  adm_agg AS (
    SELECT
      w.idx,
      COUNT(a.id)::bigint AS admission_count
    FROM weeks w
    LEFT JOIN public.admissions a
      ON a.created_at::date >= w.week_start
     AND a.created_at::date < w.week_end
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
-- 9. GRANT execute to authenticated users
--------------------------------------------------

GRANT EXECUTE ON FUNCTION public.get_analytics_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admissions_pipeline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lead_source_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_university_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_counselor_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_trend() TO authenticated;
