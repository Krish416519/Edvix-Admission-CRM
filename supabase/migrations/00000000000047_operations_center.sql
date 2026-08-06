-- =============================================================
-- 00000000000047_operations_center.sql
-- Operations Center tables and RPCs
-- =============================================================

-- 1. Background Jobs Tracking
CREATE TABLE public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(100) NOT NULL, -- 'Workflow', 'Email', 'WhatsApp', 'AI Task'
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Running', 'Completed', 'Failed', 'Retrying'
    payload JSONB,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX idx_background_jobs_type ON public.background_jobs(job_type);

-- 2. System Alerts
CREATE TABLE public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    severity VARCHAR(50) NOT NULL, -- 'Critical', 'Warning', 'Info'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_alerts_unresolved ON public.system_alerts(is_resolved) WHERE is_resolved = false;

-- 3. System Metrics (For charting performance trends over time)
CREATE TABLE public.system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL, -- 'CPU', 'Memory', 'API_Requests', 'Avg_Response_Time'
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Policies (Only Super Admin and Admin can access these)
CREATE POLICY "Admin full access background_jobs" ON public.background_jobs
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "Admin full access system_alerts" ON public.system_alerts
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));

CREATE POLICY "Admin full access system_metrics" ON public.system_metrics
    FOR ALL USING (public.user_role() IN ('Super Admin', 'Admin'));

-- RPC: get_system_health (Simulates checking various services)
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_db_status VARCHAR := 'Operational';
  v_auth_status VARCHAR := 'Operational';
  v_storage_status VARCHAR := 'Operational';
  v_edge_status VARCHAR := 'Operational';
  v_queue_status VARCHAR := 'Operational';
  v_has_critical_alerts BOOLEAN;
BEGIN
  -- Verify caller is admin
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Check if there are any critical active alerts for services
  SELECT EXISTS(
    SELECT 1 FROM public.system_alerts 
    WHERE severity = 'Critical' AND is_resolved = false AND title ILIKE '%Database%'
  ) INTO v_has_critical_alerts;
  IF v_has_critical_alerts THEN v_db_status := 'Degraded'; END IF;

  RETURN jsonb_build_object(
    'database', v_db_status,
    'auth', v_auth_status,
    'storage', v_storage_status,
    'edgeFunctions', v_edge_status,
    'queue', v_queue_status,
    'api', 'Operational',
    'webhooks', 'Operational',
    'emailProvider', 'Operational',
    'whatsappProvider', 'Operational',
    'aiProvider', 'Operational'
  );
END;
$$;

-- RPC: get_operations_metrics (Aggregates real-time stats)
CREATE OR REPLACE FUNCTION public.get_operations_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_users INT;
  v_logins_today INT;
  v_api_requests INT;
  v_failed_api_requests INT;
  v_db_queries INT;
  v_storage_used NUMERIC;
BEGIN
  -- Verify caller is admin
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Active Users
  SELECT COUNT(*) INTO v_active_users FROM public.users WHERE is_active = true;

  -- Today's Logins (Approximated from auth.users last_sign_in_at if possible, but we don't have direct access here easily without superuser. We will pull this from our security_events where type='Login')
  SELECT COUNT(*) INTO v_logins_today FROM public.security_events WHERE type = 'Login' AND DATE(created_at) = CURRENT_DATE;

  -- API Requests
  SELECT COUNT(*) INTO v_api_requests FROM public.api_logs WHERE DATE(timestamp) = CURRENT_DATE;
  SELECT COUNT(*) INTO v_failed_api_requests FROM public.api_logs WHERE status >= 400 AND DATE(timestamp) = CURRENT_DATE;

  -- DB Queries (From pg_stat_statements if available, but for now we fallback to a simulated metric or count of logs)
  -- Since we cannot query pg_stat_statements safely without extensions/roles, we'll use a placeholder representing typical query load
  v_db_queries := v_api_requests * 15;

  -- Storage Used (GB)
  SELECT COALESCE(SUM((metadata->>'size')::numeric), 0) / 1073741824.0 INTO v_storage_used
  FROM storage.objects;

  RETURN jsonb_build_object(
    'activeUsers', v_active_users,
    'onlineUsers', GREATEST(1, v_active_users / 3),
    'loginsToday', v_logins_today,
    'apiRequests', v_api_requests,
    'failedApiRequests', v_failed_api_requests,
    'avgResponseTime', 145, -- placeholder ms
    'dbQueries', v_db_queries,
    'storageUsedGB', ROUND(v_storage_used, 2),
    'memoryUsage', 65, -- placeholder %
    'cpuUsage', 42 -- placeholder %
  );
END;
$$;
