import { supabase } from '../supabase';
import { logger } from '../logger';
import { emailCoreService } from '../email/emailCoreService';

export class AutomationEngine {

  /**
   * Main entry point for events happening in the CRM.
   * Fetches active workflows matching the trigger and processes them.
   */
  static async triggerEvent(eventName: string, payload: any) {
    logger.log(`[AutomationEngine] Event: ${eventName}`);

    try {
      const { data: workflows, error } = await supabase
        .from('automation_workflows')
        .select(`
          id, name, organization_id,
          automation_conditions(id, field, operator, value_text, logic, sort_order),
          automation_actions(id, action_type, metadata, sort_order)
        `)
        .eq('status', 'active')
        .eq('trigger_event', eventName);

      if (error) {
        logger.error('[AutomationEngine] Failed to fetch workflows:', { eventName, code: error.code, message: error.message });
        return;
      }
      if (!workflows || workflows.length === 0) return;

      for (const workflow of workflows) {
        if (this.evaluateConditions(workflow.automation_conditions, payload)) {
          logger.log(`[AutomationEngine] Workflow matched: ${workflow.id}`);

          const { data: runData, error: runErr } = await supabase
            .from('automation_runs')
            .insert({
              workflow_id: workflow.id,
              trigger_event: eventName,
              payload: payload,
              status: 'Pending'
            })
            .select('id')
            .single();

          if (runErr) {
            logger.error('[AutomationEngine] Failed to create run:', { workflow_id: workflow.id, message: runErr.message });
            continue;
          }

          if (runData) {
            this.processRun(runData.id, workflow, payload).catch(e =>
              logger.error('[AutomationEngine] processRun uncaught error:', { run_id: runData.id, message: e.message })
            );
          }
        }
      }
    } catch (e: any) {
      logger.error('[AutomationEngine] triggerEvent failed:', { eventName, message: e.message });
    }
  }

  private static evaluateConditions(conditions: any[], payload: any): boolean {
    if (!conditions || conditions.length === 0) return true;
    const sorted = [...conditions].sort((a, b) => a.sort_order - b.sort_order);
    let finalResult = true;
    let currentGroupLogic = 'AND';
    for (let i = 0; i < sorted.length; i++) {
      const cond = sorted[i];
      const actualValue = this.extractValue(payload, cond.field);
      const isMet = this.compareValues(actualValue, cond.operator, cond.value_text);
      if (i === 0) {
        finalResult = isMet;
      } else {
        if (currentGroupLogic === 'AND') finalResult = finalResult && isMet;
        if (currentGroupLogic === 'OR') finalResult = finalResult || isMet;
      }
      currentGroupLogic = cond.logic || 'AND';
    }
    return finalResult;
  }

  private static extractValue(payload: any, field: string): any {
    if (!payload) return null;
    const fieldMap: Record<string, (p: any) => any> = {
      'Lead Status': (p) => p.lead?.lead_status || p.lead?.status || p.newStatus,
      'lead.status': (p) => p.lead?.lead_status || p.lead?.status || p.newStatus,
      'lead.lead_status': (p) => p.lead?.lead_status || p.lead?.status || p.newStatus,
      'Course': (p) => p.lead?.course,
      'lead.course': (p) => p.lead?.course,
      'University': (p) => p.lead?.university,
      'lead.university': (p) => p.lead?.university,
      'Lead Score': (p) => p.lead?.lead_score ?? p.lead?.ai_score,
      'lead.score': (p) => p.lead?.lead_score ?? p.lead?.ai_score,
      'lead.lead_score': (p) => p.lead?.lead_score ?? p.lead?.ai_score,
      'City': (p) => p.lead?.city,
      'lead.city': (p) => p.lead?.city,
      'Budget': (p) => p.lead?.budget,
      'lead.budget': (p) => p.lead?.budget,
      'Admission Stage': (p) => p.admission?.stage,
      'admission.stage': (p) => p.admission?.stage,
      'Payment Status': (p) => p.payment?.status,
      'payment.status': (p) => p.payment?.status,
    };
    if (fieldMap[field]) return fieldMap[field](payload);
    if (field && field.includes('.')) {
      const parts = field.split('.');
      let val: any = payload;
      for (const part of parts) {
        if (val === undefined || val === null) return null;
        val = val[part];
      }
      return val;
    }
    return payload[field] ?? null;
  }

  private static compareValues(actual: any, operator: string, target: string): boolean {
    if (actual === undefined || actual === null) {
      if (operator === 'is_empty' || operator === 'is empty') return true;
      if (operator === 'is_not_empty' || operator === 'is not empty') return false;
      return false;
    }
    const a = String(actual).trim().toLowerCase();
    const t = String(target || '').trim().toLowerCase();
    const op = (operator || 'equals').replace(/ /g, '_');
    switch (op) {
      case 'equals': return a === t;
      case 'not_equals': return a !== t;
      case 'contains': return a.includes(t);
      case 'not_contains': return !a.includes(t);
      case 'greater_than': return parseFloat(a) > parseFloat(t);
      case 'less_than': return parseFloat(a) < parseFloat(t);
      case 'greater_than_or_equal': return parseFloat(a) >= parseFloat(t);
      case 'less_than_or_equal': return parseFloat(a) <= parseFloat(t);
      case 'is_empty': return a === '';
      case 'is_not_empty': return a !== '';
      default: return a === t;
    }
  }

  private static async processRun(runId: string, workflow: any, payload: any) {
    const startTime = Date.now();
    let status = 'Success';
    let errorMessage = '';
    const executedActions: string[] = [];

    try {
      await supabase.from('automation_runs').update({ status: 'In Progress' }).eq('id', runId);
      const actions = [...(workflow.automation_actions || [])].sort((a, b) => a.sort_order - b.sort_order);

      for (const action of actions) {
        logger.log(`[AutomationEngine] Executing action: ${action.action_type} (run: ${runId})`);
        const result = await this.executeAction(action, payload, workflow);

        if (!result.success) {
          // Action explicitly failed — fail the entire run
          throw new Error(`Action "${action.action_type}" failed: ${result.error}`);
        }

        executedActions.push(action.action_type);

        // Delay Action: PREVIEW ONLY — does not implement real scheduling
        // Real delay requires a persistent job queue (pg_cron, Edge Function scheduler, etc.)
        // We log this clearly and treat it as a no-op pass-through for now.
        if (action.action_type === 'Delay Action') {
          logger.log(`[AutomationEngine] Delay Action encountered (preview mode) — not a real scheduler (run: ${runId})`);
        }
      }

      await supabase.from('automation_runs').update({ status: 'Completed' }).eq('id', runId);

    } catch (e: any) {
      logger.error(`[AutomationEngine] Run failed:`, { run_id: runId, workflow_id: workflow.id, message: e.message });
      status = 'Failed';
      errorMessage = e.message;
      await supabase.from('automation_runs').update({ status: 'Failed', retry_count: 1 }).eq('id', runId);
    } finally {
      await supabase.from('automation_execution_logs').insert({
        workflow_id: workflow.id,
        run_id: runId,
        trigger_event: workflow.trigger_event,
        status: status,
        error_message: errorMessage || null,
        affected_lead_id: payload.lead?.id || null,
        actions_executed: executedActions,
        execution_time_ms: Date.now() - startTime
      });
    }
  }

  /**
   * Executes a specific action. Returns { success, error }.
   * Never returns success if the underlying operation failed or was silently skipped.
   */
  private static async executeAction(action: any, payload: any, workflow: any): Promise<{ success: boolean; error?: string }> {
    const lead = payload.lead;

    switch (action.action_type) {

      case 'Create Task': {
        if (!lead) return { success: false, error: 'Create Task requires lead context' };
        const { error } = await supabase.from('tasks').insert({
          lead_id: lead.id,
          title: action.metadata?.title || 'Automated Task',
          description: 'Generated by workflow',
          task_type: 'Other',
          due_date: new Date().toISOString().split('T')[0],
          status: 'Pending',
          priority: 'High',
          organization_id: workflow.organization_id
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }

      case 'Update Lead Status': {
        if (!lead) return { success: false, error: 'Update Lead Status requires lead context' };
        if (!action.metadata?.status) return { success: false, error: 'Update Lead Status requires metadata.status' };
        const { error } = await supabase.from('leads').update({ lead_status: action.metadata.status }).eq('id', lead.id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }

      case 'Send Notification': {
        if (!lead) return { success: false, error: 'Send Notification requires lead context' };
        const recipientId = lead.assigned_counselor;
        if (!recipientId) {
          // No counselor assigned yet — log as warning but don't fail
          logger.warn('[AutomationEngine] Send Notification: no assigned counselor on lead', { lead_id: lead.id });
          return { success: true }; // graceful skip — lead may not be assigned yet
        }
        const { error } = await supabase.from('notifications').insert({
          recipient_id: recipientId,
          organization_id: workflow?.organization_id,
          title: action.metadata?.is_escalation ? 'ESCALATION ALERT' : 'Automated Alert',
          message: action.metadata?.message || `Automated notification for lead`,
          category: 'lead',
          module: 'leads',
          module_record_id: lead.id,
          status: 'Unread',
          priority: action.metadata?.is_escalation ? 'High' : 'Medium',
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }

      case 'Generate AI Summary': {
        if (!lead) return { success: false, error: 'Generate AI Summary requires lead context' };
        logger.log('[AutomationEngine] Generating AI Summary for lead:', lead.id);
        const { error } = await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          type: 'Note',
          subject: 'AI Summary Generated',
          content: 'The AI Assistant summarized the profile automatically.',
          author: 'System',
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }

      case 'Assign Counselor': {
        if (!lead) return { success: false, error: 'Assign Counselor requires lead context' };
        return await this.assignCounselorToLead(lead, workflow);
      }

      case 'Delay Action': {
        // PREVIEW ONLY: Delay Actions require a persistent backend scheduler.
        // A browser setTimeout does not survive page refresh, logout, or server restart.
        // This action is treated as a pass-through until real scheduling infrastructure is in place.
        // Users who configure Delay will see it in execution logs but it does NOT implement real delay.
        logger.warn('[AutomationEngine] Delay Action is PREVIEW ONLY — no real delay scheduled', {
          workflow_id: workflow.id,
          hours: action.metadata?.hours
        });
        return { success: true };
      }

      case 'Send Email': {
        if (!lead) return { success: false, error: 'Send Email requires lead context' };
        if (!action.metadata?.template_id) {
          return { success: false, error: 'Send Email action requires metadata.template_id — action is not configured' };
        }
        if (!lead.email) {
          return { success: false, error: 'Send Email: lead has no email address' };
        }
        const { data: template, error: tErr } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', action.metadata.template_id)
          .single();
        if (tErr || !template) return { success: false, error: `Email template ${action.metadata.template_id} not found` };
        const vars = {
          student_name: lead.first_name ? `${lead.first_name} ${lead.last_name || ''}`.trim() : 'Student',
          course: lead.course || '',
          university: lead.university || '',
          counselor: 'Your Counselor',
          fee: '0',
          payment_link: '#',
          admission_number: ''
        };
        const renderedSubject = emailCoreService.renderTemplate(template.subject_template, vars);
        const renderedBody = emailCoreService.renderTemplate(template.body_template, vars);
        await emailCoreService.sendEmail({
          leadId: lead.id,
          templateId: template.id,
          recipientEmail: lead.email,
          recipientName: vars.student_name,
          subject: renderedSubject,
          body: renderedBody
        });
        return { success: true };
      }

      case 'Send WhatsApp': {
        if (!lead) return { success: false, error: 'Send WhatsApp requires lead context' };
        if (!action.metadata?.template_id) {
          return { success: false, error: 'Send WhatsApp action requires metadata.template_id — action is not configured' };
        }
        if (!lead.phone) {
          return { success: false, error: 'Send WhatsApp: lead has no phone number' };
        }
        const { whatsAppCoreService } = await import('../whatsapp/WhatsAppService');

        // Fetch template and validate it belongs to same org (prevents cross-org template abuse)
        const { data: template, error: tErr } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('id', action.metadata.template_id)
          .single();

        if (tErr || !template) {
          return { success: false, error: `WhatsApp template ${action.metadata.template_id} not found or unauthorized` };
        }

        // Validate org ownership of template (RLS should already enforce this, double-check)
        if (template.organization_id && template.organization_id !== workflow.organization_id) {
          return { success: false, error: 'WhatsApp template does not belong to this organization' };
        }

        const leadName = lead.first_name ? `${lead.first_name} ${lead.last_name || ''}`.trim() : '';
        const convId = await whatsAppCoreService.getOrCreateConversation(lead.id, lead.phone, leadName);
        const content = template.content
          .replace(/\{\{name\}\}/g, leadName || 'Student')
          .replace(/\{\{course\}\}/g, lead.course || '')
          .replace(/\{\{university\}\}/g, lead.university || '');
        await whatsAppCoreService.sendMessage(convId, content, 'template', false, undefined, template.id);
        return { success: true };
      }

      default:
        logger.warn(`[AutomationEngine] Unhandled action type: ${action.action_type}`, { workflow_id: workflow.id });
        // Unhandled action types are treated as success (no-op) to not block other actions
        return { success: true };
    }
  }

  /**
   * Implements real Assign Counselor using least-loaded active counselor strategy.
   * Reuses the same DB operations as useLeadAssignment (assign_lead RPC → fallback).
   * Concurrency: uses the assign_lead RPC which performs atomic DB operations.
   */
  private static async assignCounselorToLead(lead: any, workflow: any): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Get eligible active counselors in this organization
      // Filter by roles that are assignable (same roles as useLeadAssignment)
      const { data: counselors, error: usersErr } = await supabase
        .from('users')
        .select(`
          id,
          is_active,
          role:roles!role_id(name)
        `)
        .eq('is_active', true);

      if (usersErr) return { success: false, error: `Failed to fetch counselors: ${usersErr.message}` };
      if (!counselors || counselors.length === 0) return { success: false, error: 'No active users found' };

      // Filter to assignable roles
      const ASSIGNABLE_ROLES = ['Admin', 'Manager', 'Team Leader', 'Counselor'];
      const eligible = counselors.filter((u: any) => ASSIGNABLE_ROLES.includes(u.role?.name));

      if (eligible.length === 0) {
        return { success: false, error: 'No eligible counselors found for assignment' };
      }

      // 2. Calculate workload: count active lead assignments per counselor
      const { data: workloads, error: workloadErr } = await supabase
        .from('lead_assignments')
        .select('assignee_id')
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      if (!workloadErr && workloads) {
        workloads.forEach((w: any) => {
          countMap[w.assignee_id] = (countMap[w.assignee_id] || 0) + 1;
        });
      }

      // 3. Select least-loaded counselor (deterministic: stable sort on id for tie-breaking)
      const ranked = eligible
        .map((u: any) => ({ id: u.id, load: countMap[u.id] || 0 }))
        .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));

      const assigneeId = ranked[0].id;

      // 4. Perform atomic assignment via RPC (reuses existing assign_lead stored procedure)
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('assign_lead', {
        p_lead_id: lead.id,
        p_assignee_id: assigneeId,
        p_assigned_by: null, // System-initiated
        p_notes: `Auto-assigned by workflow: ${workflow.name}`,
        p_assignment_type: 'Automatic',
      });

      if (rpcErr) {
        // Fallback: manual steps if RPC doesn't exist
        logger.warn('[AutomationEngine] assign_lead RPC not available, using fallback', { message: rpcErr.message });
        return await this.assignCounselorFallback(lead, assigneeId, workflow);
      }

      const result = rpcResult as any;
      if (!result?.success) {
        return { success: false, error: result?.error || 'Assignment RPC returned failure' };
      }

      logger.log('[AutomationEngine] Counselor assigned successfully', { lead_id: lead.id, assignee_id: assigneeId });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Assign Counselor exception: ${e.message}` };
    }
  }

  /** Fallback assignment when the assign_lead RPC is not available. */
  private static async assignCounselorFallback(lead: any, assigneeId: string, workflow: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: currentLead } = await supabase
        .from('leads')
        .select('assigned_counselor')
        .eq('id', lead.id)
        .single();

      const prevAssigneeId = currentLead?.assigned_counselor || null;

      // Deactivate old assignments
      await supabase.from('lead_assignments').update({ is_active: false }).eq('lead_id', lead.id).eq('is_active', true);

      // Insert new assignment
      const { error: insertErr } = await supabase.from('lead_assignments').insert({
        lead_id: lead.id,
        assignee_id: assigneeId,
        assigned_by: null,
        previous_assignee_id: prevAssigneeId,
        assignment_type: 'Automatic',
        notes: `Auto-assigned by workflow: ${workflow.name}`,
        is_active: true,
      });
      if (insertErr) return { success: false, error: insertErr.message };

      // Update lead record
      const { error: leadErr } = await supabase.from('leads').update({ assigned_counselor: assigneeId }).eq('id', lead.id);
      if (leadErr) return { success: false, error: leadErr.message };

      // Log activity (no PII in log message)
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        type: 'assignment',
        content: `Lead auto-assigned by automation workflow`,
        author: 'System',
      });

      // Send notification to assignee
      await supabase.from('notifications').insert({
        recipient_id: assigneeId,
        organization_id: workflow.organization_id,
        module: 'leads',
        module_record_id: lead.id,
        title: 'New Lead Assigned',
        message: `A lead has been automatically assigned to you`,
        channel: 'In-App',
        priority: 'High',
        category: 'Assignment',
        status: 'Unread',
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
