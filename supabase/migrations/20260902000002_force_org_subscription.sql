DO $$ 
DECLARE 
    org RECORD;
    plan_id_to_use UUID;
BEGIN
    -- Try to get Enterprise plan, if not any plan
    SELECT id INTO plan_id_to_use FROM public.plans WHERE name = 'Enterprise' LIMIT 1;
    IF plan_id_to_use IS NULL THEN
        SELECT id INTO plan_id_to_use FROM public.plans LIMIT 1;
    END IF;

    -- If no plans exist, create one!
    IF plan_id_to_use IS NULL THEN
        INSERT INTO public.plans (name, features) VALUES ('Enterprise', '{"all": true}'::jsonb) RETURNING id INTO plan_id_to_use;
    END IF;
    
    FOR org IN SELECT * FROM public.organizations LOOP
        -- Delete any existing broken subscriptions for this org
        DELETE FROM public.organization_subscriptions WHERE organization_id = org.id;
        
        -- Insert a fresh, active subscription
        INSERT INTO public.organization_subscriptions (organization_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
        VALUES (
            org.id, 
            plan_id_to_use, 
            'active', 
            NOW(), 
            NOW() + INTERVAL '14 days', 
            NOW(), 
            NOW() + INTERVAL '1 year'
        );
    END LOOP;
END $$;
