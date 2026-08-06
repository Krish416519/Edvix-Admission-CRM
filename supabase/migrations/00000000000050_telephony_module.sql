-- Create tables for the Telephony & Call Center Module

CREATE TABLE IF NOT EXISTS public.telephony_providers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    provider_type text NOT NULL, -- e.g., 'Twilio', 'Exotel', 'Knowlarity', 'CustomSIP'
    config jsonb DEFAULT '{}'::jsonb, -- Store API keys, auth tokens, webhook URLs
    is_active boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    counselor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    provider_id uuid REFERENCES public.telephony_providers(id) ON DELETE SET NULL,
    provider_call_id text,
    direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status text NOT NULL CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'missed', 'failed', 'voicemail', 'busy', 'no-answer')),
    duration_seconds integer DEFAULT 0,
    recording_url text,
    
    -- Outcome & Logging
    outcome text, -- e.g., 'Interested', 'Not Interested', 'Call Back Later'
    notes text,
    tags text[] DEFAULT '{}'::text[],
    next_follow_up timestamptz,
    
    -- AI Fields
    transcript text,
    ai_summary text,
    ai_sentiment text,
    ai_objections text[],
    ai_action_items text[],
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.telephony_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Telephony Providers Policies (Super Admins manage, others read active)
CREATE POLICY "Super Admins can manage telephony providers"
    ON public.telephony_providers
    FOR ALL
    TO authenticated
    USING (public.user_role() = 'Super Admin');

CREATE POLICY "Everyone can view active telephony providers"
    ON public.telephony_providers
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Calls Policies
-- Super Admins and Managers can see all calls
-- Counselors can see calls for their leads, or their own calls
CREATE POLICY "Super Admins can manage all calls"
    ON public.calls
    FOR ALL
    TO authenticated
    USING (public.user_role() = 'Super Admin');

CREATE POLICY "Managers can view all calls"
    ON public.calls
    FOR SELECT
    TO authenticated
    USING (public.user_role() = 'Manager');

CREATE POLICY "Counselors can view their own calls"
    ON public.calls
    FOR SELECT
    TO authenticated
    USING (counselor_id = auth.uid() OR public.user_role() = 'Counselor');

CREATE POLICY "Counselors can insert their own calls"
    ON public.calls
    FOR INSERT
    TO authenticated
    WITH CHECK (counselor_id = auth.uid() OR public.user_role() = 'Counselor');

CREATE POLICY "Counselors can update their own calls"
    ON public.calls
    FOR UPDATE
    TO authenticated
    USING (counselor_id = auth.uid() OR public.user_role() = 'Counselor');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_counselor_id ON public.calls(counselor_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);

-- Triggers for updated_at
CREATE TRIGGER update_telephony_providers_modtime
    BEFORE UPDATE ON public.telephony_providers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calls_modtime
    BEFORE UPDATE ON public.calls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
