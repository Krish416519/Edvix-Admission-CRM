-- 00000000000068_task_webhooks.sql

CREATE OR REPLACE FUNCTION public.notify_task_events()
RETURNS TRIGGER AS $$
DECLARE
    webhook RECORD;
    payload JSONB;
    detected_events TEXT[] := '{}';
    evt TEXT;
    task_org_id UUID;
BEGIN
    -- Determine the organization_id from the parent lead or assigned user
    IF NEW.lead_id IS NOT NULL THEN
        SELECT organization_id INTO task_org_id FROM public.leads WHERE id = NEW.lead_id;
    END IF;
    
    -- Fallback to the user's organization if task isn't explicitly tied to a lead
    IF task_org_id IS NULL THEN
        SELECT organization_id INTO task_org_id 
        FROM public.user_organizations 
        WHERE user_id = NEW.assigned_to_id 
        LIMIT 1;
    END IF;

    IF TG_OP = 'INSERT' THEN
        detected_events := array_append(detected_events, 'task.created');
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
            detected_events := array_append(detected_events, 'task.completed');
        END IF;
        IF NEW.status = 'Overdue' AND (OLD.status IS NULL OR OLD.status != 'Overdue') THEN
            detected_events := array_append(detected_events, 'task.overdue');
        END IF;
    END IF;

    IF array_length(detected_events, 1) IS NOT NULL AND task_org_id IS NOT NULL THEN
        FOREACH evt IN ARRAY detected_events
        LOOP
            payload := jsonb_build_object(
                'event', evt,
                'task_id', NEW.id,
                'title', NEW.title,
                'description', COALESCE(NEW.description, ''),
                'type', NEW.type,
                'priority', NEW.priority,
                'status', NEW.status,
                'due_date', NEW.due_date,
                'assigned_to_id', NEW.assigned_to_id,
                'lead_id', NEW.lead_id
            );

            FOR webhook IN 
                SELECT url, secret 
                FROM public.webhooks 
                WHERE organization_id = task_org_id 
                AND status = 'Active' 
                AND evt = ANY(events)
            LOOP
                PERFORM net.http_post(
                    url := webhook.url,
                    body := payload,
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'X-Edvix-Signature', encode(extensions.hmac(payload::text::bytea, webhook.secret::bytea, 'sha256'), 'hex')
                    )
                );
            END LOOP;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_task_events ON public.tasks;

CREATE TRIGGER trg_notify_task_events
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_task_events();
