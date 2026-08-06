-- 00000000000051_telephony_enhancement.sql
-- Edvix AI CRM - Enhanced Call Center Module

--------------------------------------------------
-- 1. CALL EVENTS (Realtime lifecycle tracking)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('initiated', 'ringing', 'answered', 'hold', 'unhold', 'mute', 'unmute', 'transfer', 'conference_join', 'conference_leave', 'disconnect', 'failed')),
    event_data jsonb DEFAULT '{}'::jsonb,
    performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON public.call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_call_events_created_at ON public.call_events(created_at DESC);

--------------------------------------------------
-- 2. CALL RECORDINGS (Separate with role-based access)
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_recordings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    recording_url text NOT NULL,
    duration_seconds integer DEFAULT 0,
    file_size_bytes bigint,
    is_encrypted boolean DEFAULT false,
    access_level text DEFAULT 'admin' CHECK (access_level IN ('admin', 'manager', 'counselor', 'all')),
    transcription_status text DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON public.call_recordings(call_id);

--------------------------------------------------
-- 3. CALL AUDIT LOG
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_audit_log_call_id ON public.call_audit_log(call_id);
CREATE INDEX IF NOT EXISTS idx_call_audit_log_user_id ON public.call_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_call_audit_log_created_at ON public.call_audit_log(created_at DESC);

--------------------------------------------------
-- 4. ADD MISSING COLUMNS TO CALLS TABLE
--------------------------------------------------
DO $$ BEGIN
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS lead_name text;
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS lead_phone text;
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS counselor_name text;
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ai_recommended_next_steps text[];
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ai_follow_up_email text;
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ai_whatsapp_message text;
    ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ai_lead_score_delta integer DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

--------------------------------------------------
-- 5. RLS POLICIES
--------------------------------------------------
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_audit_log ENABLE ROW LEVEL SECURITY;

-- Call Events - follow same pattern as calls
DROP POLICY IF EXISTS "Super Admins manage call events" ON public.call_events;
CREATE POLICY "Super Admins manage call events"
    ON public.call_events FOR ALL TO authenticated
    USING (public.user_role() = 'Super Admin');

DROP POLICY IF EXISTS "Users can view call events for their calls" ON public.call_events;
CREATE POLICY "Users can view call events for their calls"
    ON public.call_events FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.calls c
            WHERE c.id = call_id
            AND (c.counselor_id = auth.uid() OR public.user_role() IN ('Super Admin', 'Manager', 'Admin'))
        )
    );

DROP POLICY IF EXISTS "Users can insert call events" ON public.call_events;
CREATE POLICY "Users can insert call events"
    ON public.call_events FOR INSERT TO authenticated
    WITH CHECK (performed_by = auth.uid());

-- Call Recordings - restricted by access level
DROP POLICY IF EXISTS "Super Admins manage recordings" ON public.call_recordings;
CREATE POLICY "Super Admins manage recordings"
    ON public.call_recordings FOR ALL TO authenticated
    USING (public.user_role() = 'Super Admin');

DROP POLICY IF EXISTS "Role-based recording access" ON public.call_recordings;
CREATE POLICY "Role-based recording access"
    ON public.call_recordings FOR SELECT TO authenticated
    USING (
        access_level = 'all'
        OR (access_level = 'counselor' AND EXISTS (
            SELECT 1 FROM public.calls c WHERE c.id = call_id AND c.counselor_id = auth.uid()
        ))
        OR (access_level = 'manager' AND public.user_role() IN ('Manager', 'Admin', 'Super Admin'))
        OR (access_level = 'admin' AND public.user_role() IN ('Admin', 'Super Admin'))
    );

DROP POLICY IF EXISTS "Users can insert recordings" ON public.call_recordings;
CREATE POLICY "Users can insert recordings"
    ON public.call_recordings FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Audit Log - admins only for read, anyone can insert
DROP POLICY IF EXISTS "Admins can view audit log" ON public.call_audit_log;
CREATE POLICY "Admins can view audit log"
    ON public.call_audit_log FOR SELECT TO authenticated
    USING (public.user_role() IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Users can insert audit entries" ON public.call_audit_log;
CREATE POLICY "Users can insert audit entries"
    ON public.call_audit_log FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

--------------------------------------------------
-- 6. AUTOMATION TRIGGERS FOR CALLS
--------------------------------------------------
INSERT INTO public.automation_triggers (event_name, description)
VALUES
    ('Call Completed', 'Fires when a call ends with status completed'),
    ('Call Missed', 'Fires when a call ends with status missed or no-answer'),
    ('Call Failed', 'Fires when a call fails to connect')
ON CONFLICT (event_name) DO NOTHING;

--------------------------------------------------
-- 7. RPC: Get Call Center Stats (today)
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_call_center_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    today_start timestamptz := date_trunc('day', now());
BEGIN
    SELECT jsonb_build_object(
        'active_calls', COALESCE((SELECT count(*) FROM public.calls WHERE status IN ('initiated', 'ringing', 'in-progress') AND created_at >= today_start), 0),
        'total_today', COALESCE((SELECT count(*) FROM public.calls WHERE created_at >= today_start), 0),
        'total_yesterday', COALESCE((SELECT count(*) FROM public.calls WHERE created_at >= today_start - interval '1 day' AND created_at < today_start), 0),
        'missed_today', COALESCE((SELECT count(*) FROM public.calls WHERE status IN ('missed', 'no-answer') AND created_at >= today_start), 0),
        'completed_today', COALESCE((SELECT count(*) FROM public.calls WHERE status = 'completed' AND created_at >= today_start), 0),
        'avg_duration_seconds', COALESCE((SELECT ROUND(AVG(duration_seconds)) FROM public.calls WHERE status = 'completed' AND created_at >= today_start AND duration_seconds > 0), 0),
        'total_duration_seconds', COALESCE((SELECT SUM(duration_seconds) FROM public.calls WHERE status = 'completed' AND created_at >= today_start), 0),
        'inbound_today', COALESCE((SELECT count(*) FROM public.calls WHERE direction = 'inbound' AND created_at >= today_start), 0),
        'outbound_today', COALESCE((SELECT count(*) FROM public.calls WHERE direction = 'outbound' AND created_at >= today_start), 0)
    ) INTO result;
    
    RETURN result;
END;
$$;

--------------------------------------------------
-- 8. RPC: Get Counselor Call Stats
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_counselor_call_stats(
    p_date_from timestamptz DEFAULT now() - interval '30 days',
    p_date_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO result
    FROM (
        SELECT jsonb_build_object(
            'counselor_id', c.counselor_id,
            'counselor_name', COALESCE(u.name, u.email, 'Unknown'),
            'total_calls', count(*),
            'completed_calls', count(*) FILTER (WHERE c.status = 'completed'),
            'missed_calls', count(*) FILTER (WHERE c.status IN ('missed', 'no-answer')),
            'avg_duration', ROUND(COALESCE(AVG(c.duration_seconds) FILTER (WHERE c.status = 'completed' AND c.duration_seconds > 0), 0)),
            'total_duration', COALESCE(SUM(c.duration_seconds) FILTER (WHERE c.status = 'completed'), 0),
            'connection_rate', ROUND(
                CASE WHEN count(*) > 0 
                THEN (count(*) FILTER (WHERE c.status = 'completed')::numeric / count(*)::numeric) * 100 
                ELSE 0 END, 1
            )
        ) AS row_data
        FROM public.calls c
        LEFT JOIN public.users u ON c.counselor_id = u.id
        WHERE c.created_at BETWEEN p_date_from AND p_date_to
        AND c.counselor_id IS NOT NULL
        GROUP BY c.counselor_id, u.name, u.email
        ORDER BY count(*) DESC
    ) sub;
    
    RETURN result;
END;
$$;

--------------------------------------------------
-- 9. RPC: Get Call Reports
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_call_reports(
    p_date_from timestamptz DEFAULT now() - interval '30 days',
    p_date_to timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_calls', COALESCE((SELECT count(*) FROM public.calls WHERE created_at BETWEEN p_date_from AND p_date_to), 0),
        'completed_calls', COALESCE((SELECT count(*) FROM public.calls WHERE status = 'completed' AND created_at BETWEEN p_date_from AND p_date_to), 0),
        'missed_calls', COALESCE((SELECT count(*) FROM public.calls WHERE status IN ('missed', 'no-answer') AND created_at BETWEEN p_date_from AND p_date_to), 0),
        'failed_calls', COALESCE((SELECT count(*) FROM public.calls WHERE status = 'failed' AND created_at BETWEEN p_date_from AND p_date_to), 0),
        'avg_duration', COALESCE((SELECT ROUND(AVG(duration_seconds)) FROM public.calls WHERE status = 'completed' AND created_at BETWEEN p_date_from AND p_date_to AND duration_seconds > 0), 0),
        'connection_rate', COALESCE((
            SELECT ROUND(
                CASE WHEN count(*) > 0 
                THEN (count(*) FILTER (WHERE status = 'completed')::numeric / count(*)::numeric) * 100 
                ELSE 0 END, 1
            ) FROM public.calls WHERE created_at BETWEEN p_date_from AND p_date_to
        ), 0),
        'sentiment_distribution', COALESCE((
            SELECT jsonb_object_agg(COALESCE(ai_sentiment, 'unknown'), cnt)
            FROM (
                SELECT ai_sentiment, count(*) as cnt
                FROM public.calls
                WHERE created_at BETWEEN p_date_from AND p_date_to AND status = 'completed'
                GROUP BY ai_sentiment
            ) s
        ), '{}'::jsonb),
        'outcome_distribution', COALESCE((
            SELECT jsonb_object_agg(COALESCE(outcome, 'No Outcome'), cnt)
            FROM (
                SELECT outcome, count(*) as cnt
                FROM public.calls
                WHERE created_at BETWEEN p_date_from AND p_date_to AND status = 'completed'
                GROUP BY outcome
            ) o
        ), '{}'::jsonb),
        'daily_call_volume', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', d, 'count', cnt) ORDER BY d)
            FROM (
                SELECT date_trunc('day', created_at)::date as d, count(*) as cnt
                FROM public.calls
                WHERE created_at BETWEEN p_date_from AND p_date_to
                GROUP BY d
            ) dv
        ), '[]'::jsonb)
    ) INTO result;
    
    RETURN result;
END;
$$;

--------------------------------------------------
-- 10. TRIGGERS
--------------------------------------------------
DROP TRIGGER IF EXISTS update_call_events_modtime ON public.call_events;
CREATE TRIGGER update_call_events_modtime
    BEFORE UPDATE ON public.call_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
