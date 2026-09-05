DO $$ 
DECLARE 
    org RECORD;
    enterprise_plan_id UUID;
BEGIN
    SELECT id INTO enterprise_plan_id FROM public.plans WHERE name = 'Enterprise' LIMIT 1;
    
    FOR org IN SELECT * FROM public.organizations LOOP
        INSERT INTO public.organization_subscriptions (organization_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
        VALUES (
            org.id, 
            enterprise_plan_id, 
            'active', 
            NOW(), 
            NOW() + INTERVAL '14 days', 
            NOW(), 
            NOW() + INTERVAL '1 year'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
