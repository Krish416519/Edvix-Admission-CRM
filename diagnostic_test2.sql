DO $$
DECLARE
    notif_count INT;
    admin_rec RECORD;
BEGIN
    FOR admin_rec IN
        SELECT u.id FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE r.name IN ('Super Admin', 'Admin')
    LOOP
        RAISE NOTICE 'Testing insert_notification_if_preferred for admin ID: %', admin_rec.id;
        
        PERFORM public.insert_notification_if_preferred(
            admin_rec.id, 'Leads', gen_random_uuid(),
            'Debug Test',
            'Testing if this function crashes',
            'general', 'Medium'
        );
        
        RAISE NOTICE 'insert_notification_if_preferred succeeded for admin ID: %', admin_rec.id;
    END LOOP;

    SELECT count(*) INTO notif_count FROM public.notifications WHERE title = 'Debug Test';
    RAISE NOTICE 'Total notifications created during debug: %', notif_count;

    -- Clean up
    DELETE FROM public.notifications WHERE title = 'Debug Test';
END;
$$ LANGUAGE plpgsql;
