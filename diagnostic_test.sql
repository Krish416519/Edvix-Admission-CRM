DO $$
DECLARE
    new_lead_id UUID;
    notif_count INT;
    admin_count INT;
    valid_org_id UUID;
    rand_phone VARCHAR;
BEGIN
    -- Get your valid organization ID to satisfy the billing trigger
    SELECT id INTO valid_org_id FROM public.organizations LIMIT 1;

    -- Generate a completely random phone number to bypass the unique constraint
    rand_phone := '9' || floor(random() * 1000000000)::text;

    -- 1. Check how many Super Admins exist
    SELECT count(*) INTO admin_count FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE r.name IN ('Super Admin', 'Admin');
    
    RAISE NOTICE 'Found % Super Admins/Admins', admin_count;

    -- 2. Insert a test lead directly to trigger the notification
    INSERT INTO public.leads (organization_id, first_name, last_name, email, phone, lead_source, lead_status)
    VALUES (valid_org_id, 'Notification', 'Test', 'notiftest_' || extract(epoch from now()) || '@example.com', rand_phone, 'System Test', 'New')
    RETURNING id INTO new_lead_id;

    RAISE NOTICE 'Inserted Lead ID: %', new_lead_id;

    -- 3. Check if notifications were created
    SELECT count(*) INTO notif_count FROM public.notifications WHERE module_record_id = new_lead_id;

    RAISE NOTICE 'Notifications created for this lead: %', notif_count;

    IF notif_count = 0 THEN
        RAISE EXCEPTION 'TRIGGER FAILED: No notifications were created!';
    END IF;

    -- Clean up the test lead
    DELETE FROM public.leads WHERE id = new_lead_id;
    RAISE NOTICE '✅ TEST PASSED: The trigger perfectly sent the notifications at the database level.';
END;
$$ LANGUAGE plpgsql;
