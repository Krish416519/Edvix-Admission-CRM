-- 00000000000072_webhook_retries.sql

-- 1. Add columns for retries
ALTER TABLE public.webhook_deliveries 
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 4;

-- 2. Update status constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.webhook_deliveries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.webhook_deliveries DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.webhook_deliveries 
ADD CONSTRAINT webhook_deliveries_status_check 
CHECK (status IN ('Pending', 'Pending Retry', 'Success', 'Failed', 'Dead Letter'));

-- 3. Create function to process retries
CREATE OR REPLACE FUNCTION public.process_webhook_retries()
RETURNS VOID AS $$
DECLARE
    delivery RECORD;
    v_runner_url TEXT;
    v_secret TEXT;
BEGIN
    v_runner_url := COALESCE(
        current_setting('app.settings.webhook_runner_url', true), 
        'http://host.docker.internal:54321/functions/v1/webhook-runner'
    );

    FOR delivery IN 
        SELECT id, webhook_id, url, request_payload 
        FROM public.webhook_deliveries 
        WHERE status = 'Pending Retry' 
        AND next_retry_at <= NOW()
    LOOP
        -- Get secret
        SELECT secret INTO v_secret FROM public.webhooks WHERE id = delivery.webhook_id;

        -- Update status to Pending so it doesn't get picked up twice
        UPDATE public.webhook_deliveries SET status = 'Pending' WHERE id = delivery.id;

        -- Ping edge function
        PERFORM net.http_post(
            url := v_runner_url,
            body := jsonb_build_object(
                'delivery_id', delivery.id,
                'url', delivery.url,
                'secret', v_secret,
                'payload', delivery.request_payload
            ),
            headers := jsonb_build_object('Content-Type', 'application/json')
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable pg_cron and schedule it
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every minute
-- (Use an anonymous block to avoid error if job already exists)
DO $$
BEGIN
    PERFORM cron.schedule('webhook_retry_scheduler', '* * * * *', 'SELECT public.process_webhook_retries()');
EXCEPTION
    WHEN OTHERS THEN
        -- If user doesn't have permissions, we silently ignore to not break the migration
        RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END $$;
