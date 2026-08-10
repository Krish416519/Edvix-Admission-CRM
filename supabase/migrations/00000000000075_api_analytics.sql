-- 00000000000075_api_analytics.sql
-- Aggregates API and Webhook logs for the Analytics Dashboard

CREATE OR REPLACE FUNCTION public.get_api_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_of_day TIMESTAMP WITH TIME ZONE;
    
    v_requests_today INT;
    v_successful_requests INT;
    v_failed_requests INT;
    v_avg_response_ms INT;
    v_rate_limit_hits INT;
    
    v_webhook_deliveries INT;
    v_failed_webhooks INT;
    
    v_traffic JSONB;
BEGIN
    -- We'll aggregate data for "today" in UTC for simplicity, or last 24 hours
    v_start_of_day := CURRENT_DATE::TIMESTAMP WITH TIME ZONE;
    
    -- 1. API Logs Aggregation
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status < 400),
        COUNT(*) FILTER (WHERE status >= 400 AND status != 429),
        COALESCE(AVG(response_time_ms)::INT, 0),
        COUNT(*) FILTER (WHERE status = 429)
    INTO 
        v_requests_today,
        v_successful_requests,
        v_failed_requests,
        v_avg_response_ms,
        v_rate_limit_hits
    FROM public.api_logs
    WHERE timestamp >= v_start_of_day;

    -- 2. Webhook Deliveries Aggregation
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('Failed', 'Dead Letter', 'Pending Retry'))
    INTO 
        v_webhook_deliveries,
        v_failed_webhooks
    FROM public.webhook_deliveries
    WHERE created_at >= v_start_of_day;

    -- 3. Traffic by Integration (Source)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'source', COALESCE(source, 'Unknown'),
        'requests', cnt
    )), '[]'::jsonb)
    INTO v_traffic
    FROM (
        SELECT source, COUNT(*) as cnt
        FROM public.api_logs
        WHERE timestamp >= v_start_of_day
        GROUP BY source
        ORDER BY cnt DESC
        LIMIT 10
    ) sub;

    -- Build the final response object
    RETURN jsonb_build_object(
        'requests_today', COALESCE(v_requests_today, 0),
        'successful_requests', COALESCE(v_successful_requests, 0),
        'failed_requests', COALESCE(v_failed_requests, 0),
        'avg_response_ms', COALESCE(v_avg_response_ms, 0),
        'rate_limit_hits', COALESCE(v_rate_limit_hits, 0),
        'webhook_deliveries', COALESCE(v_webhook_deliveries, 0),
        'failed_webhooks', COALESCE(v_failed_webhooks, 0),
        'traffic_by_source', v_traffic
    );
END;
$$;
