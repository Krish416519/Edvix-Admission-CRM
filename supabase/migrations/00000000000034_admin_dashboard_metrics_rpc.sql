-- =============================================================
-- 00000000000034_admin_dashboard_metrics_rpc.sql
-- Creates an RPC function to aggregate metrics for the 
-- Super Admin Dashboard.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Needs to read all records regardless of user's RLS constraints to get full counts
AS $$
DECLARE
  v_total_leads INT;
  v_active_users INT;
  v_online_users INT;
  v_admissions_today INT;
  v_revenue_today NUMERIC;
  v_pending_tasks INT;
  v_pending_payments INT;
  v_pending_documents INT;
  v_ai_requests_today INT;
  v_whatsapp_today INT;
  v_emails_today INT;
  v_automations_today INT;
  v_result jsonb;
BEGIN
  -- Validate caller is admin/super admin
  IF public.user_role() NOT IN ('Super Admin', 'Admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 1. Total Leads
  SELECT COUNT(*) INTO v_total_leads FROM public.leads;

  -- 2. Active Users
  SELECT COUNT(*) INTO v_active_users FROM public.users WHERE is_active = true;

  -- 3. Online Users (Mocked for now since we don't have real-time presence tracking)
  -- Let's just say a fraction of active users are online
  v_online_users := GREATEST(1, v_active_users / 3);

  -- 4. Admissions Today
  SELECT COUNT(*) INTO v_admissions_today 
  FROM public.admissions 
  WHERE DATE(admission_date) = CURRENT_DATE;

  -- 5. Revenue Today
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue_today 
  FROM public.payments 
  WHERE status = 'Paid' AND DATE(payment_date) = CURRENT_DATE;

  -- 6. Pending Tasks
  SELECT COUNT(*) INTO v_pending_tasks 
  FROM public.tasks 
  WHERE status != 'Completed';

  -- 7. Pending Payments
  SELECT COUNT(*) INTO v_pending_payments 
  FROM public.payments 
  WHERE status = 'Pending';

  -- 8. Pending Documents
  SELECT COUNT(*) INTO v_pending_documents 
  FROM public.documents 
  WHERE verification_status = 'Pending';

  -- 9. AI Requests Today
  SELECT COUNT(*) INTO v_ai_requests_today 
  FROM public.system_logs 
  WHERE service = 'AI Model' AND DATE(created_at) = CURRENT_DATE;

  -- 10. WhatsApp Messages Today
  SELECT COUNT(*) INTO v_whatsapp_today 
  FROM public.whatsapp_messages 
  WHERE DATE(created_at) = CURRENT_DATE;

  -- 11. Emails Today
  SELECT COUNT(*) INTO v_emails_today 
  FROM public.email_messages 
  WHERE DATE(created_at) = CURRENT_DATE;

  -- 12. Automation Runs Today
  SELECT COUNT(*) INTO v_automations_today 
  FROM public.system_logs 
  WHERE service = 'Workflow' AND DATE(created_at) = CURRENT_DATE;

  v_result := jsonb_build_object(
    'totalLeads', v_total_leads,
    'activeUsers', v_active_users,
    'onlineUsers', v_online_users,
    'admissionsToday', v_admissions_today,
    'revenueToday', v_revenue_today,
    'pendingTasks', v_pending_tasks,
    'pendingPayments', v_pending_payments,
    'pendingDocuments', v_pending_documents,
    'aiRequestsToday', v_ai_requests_today,
    'whatsappMessagesToday', v_whatsapp_today,
    'emailsToday', v_emails_today,
    'automationRunsToday', v_automations_today
  );

  RETURN v_result;
END;
$$;
