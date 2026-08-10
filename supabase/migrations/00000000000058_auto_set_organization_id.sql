-- 00000000000058_auto_set_organization_id.sql

-- Helper function to auto-assign organization_id on insert
CREATE OR REPLACE FUNCTION public.set_default_organization_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.organization_id IS NULL THEN
        -- Default to the first active organization the user belongs to
        SELECT organization_id INTO NEW.organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid() AND status = 'Active'
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to all tenant tables
DO $$ 
DECLARE 
    tenant_tables text[] := ARRAY[
        'universities', 'courses', 'leads', 'lead_activities', 'tasks', 'notes', 'admissions', 'documents', 
        'payments', 'notifications', 'automation_logs', 'ai_logs', 'task_comments', 'task_reminders', 
        'task_history', 'admission_stage_history', 'admission_notes', 'admission_tags', 'document_versions', 
        'document_verification', 'document_comments', 'invoices', 'invoice_items', 'payment_receipts', 
        'payment_installments', 'ledger_entries', 'commission_rules', 'commissions', 'university_payouts', 
        'refunds', 'financial_adjustments', 'notification_channels', 'notification_templates', 
        'notification_preferences', 'notification_delivery_logs', 'ai_conversations', 'ai_messages', 
        'ai_audit_logs', 'whatsapp_conversations', 'whatsapp_messages', 'whatsapp_templates', 
        'whatsapp_webhooks', 'email_campaigns', 'email_messages', 'email_templates', 'marketing_campaigns', 
        'marketing_leads', 'integrations', 'partner_agreements', 'partner_commissions', 'partner_leads', 
        'university_agreements', 'university_contacts', 'telephony_calls', 'telephony_logs', 'telephony_agents', 
        'telephony_recordings', 'ai_recommendations', 'admission_os_workflows', 'admission_os_runs'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tenant_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS trg_set_org_id_%I ON public.%I;
                CREATE TRIGGER trg_set_org_id_%I
                BEFORE INSERT ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.set_default_organization_id();
            ', t, t, t, t);
        END IF;
    END LOOP;
END $$;
