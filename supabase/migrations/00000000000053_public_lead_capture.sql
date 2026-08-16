-- 00000000000053_public_lead_capture.sql
-- Edvix AI CRM - Public Lead Capture RPC

CREATE OR REPLACE FUNCTION public.public_submit_lead(
    p_name text,
    p_email text,
    p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator
AS $$
DECLARE
    new_lead_id uuid;
    result jsonb;
BEGIN
    -- Basic validation
    IF p_name IS NULL OR p_name = '' THEN
        RAISE EXCEPTION 'Name is required';
    END IF;

    -- Insert the lead
    INSERT INTO public.leads (
        first_name,
        last_name,
        email,
        phone,
        lead_source,
        lead_status,
        priority,
        score
    ) VALUES (
        split_part(p_name, ' ', 1),
        substring(p_name from position(' ' in p_name) + 1),
        p_email,
        p_phone,
        'AI Chatbot',
        'New',
        'High', -- Captured leads from bot have high intent
        10
    ) RETURNING id INTO new_lead_id;

    -- Return success payload
    result := jsonb_build_object(
        'success', true,
        'lead_id', new_lead_id,
        'message', 'Lead successfully captured'
    );
    
    RETURN result;
END;
$$;

-- Allow anon role (unauthenticated) to execute this function
GRANT EXECUTE ON FUNCTION public.public_submit_lead(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_submit_lead(text, text, text) TO authenticated;
