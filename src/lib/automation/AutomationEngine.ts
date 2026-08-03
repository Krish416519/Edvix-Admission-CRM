import { supabase } from '../supabase';
import { Lead } from '../../types/schema';
import { toast } from 'sonner';

export class AutomationEngine {
  
  /**
   * Main entry point for events happening in the CRM.
   * e.g., AutomationEngine.triggerEvent('Lead Status Changed', { lead: leadData, newStatus: 'Qualified' })
   */
  static async triggerEvent(eventName: string, payload: any) {
    console.log(`[AutomationEngine] Event Triggered: ${eventName}`, payload);
    
    try {
      // 1. Fetch active workflows matching this trigger
      const { data: workflows, error } = await supabase
        .from('automation_workflows')
        .select(`
          id, name,
          automation_conditions(id, field, operator, value_text, logic, sort_order),
          automation_actions(id, action_type, metadata, sort_order)
        `)
        .eq('status', 'active')
        .eq('trigger_event', eventName);

      if (error || !workflows || workflows.length === 0) return;

      // 2. Evaluate conditions and queue runs for matching workflows
      for (const workflow of workflows) {
        if (this.evaluateConditions(workflow.automation_conditions, payload)) {
          console.log(`[AutomationEngine] Workflow Matched: ${workflow.name}`);
          
          // Enqueue run
          const { data: runData } = await supabase
            .from('automation_runs')
            .insert({
              workflow_id: workflow.id,
              trigger_event: eventName,
              payload: payload,
              status: 'Pending'
            })
            .select('id')
            .single();

          if (runData) {
            // Process async so we don't block the UI
            this.processRun(runData.id, workflow, payload).catch(console.error);
          }
        }
      }
    } catch (e) {
      console.error('[AutomationEngine] Trigger failed:', e);
    }
  }

  /**
   * Evaluates a set of conditions against the payload.
   * Example payload: { lead: { status: 'New', course: 'MBA' } }
   */
  private static evaluateConditions(conditions: any[], payload: any): boolean {
    if (!conditions || conditions.length === 0) return true; // No conditions = always run

    // Sort by sort_order
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
    const fieldMap: Record<string, (p: any) => any> = {
      'Lead Status': (p) => p.lead?.status || p.newStatus,
      'Course': (p) => p.lead?.course,
      'University': (p) => p.lead?.university,
      'Lead Score': (p) => p.lead?.ai_score,
      'Admission Stage': (p) => p.admission?.stage,
    };
    
    if (fieldMap[field]) return fieldMap[field](payload);
    return null;
  }

  private static compareValues(actual: any, operator: string, target: string): boolean {
    if (actual === undefined || actual === null) return false;
    
    const a = String(actual).toLowerCase();
    const t = String(target).toLowerCase();

    switch (operator) {
      case 'equals': return a === t;
      case 'not equals': return a !== t;
      case 'contains': return a.includes(t);
      case 'greater than': return parseFloat(a) > parseFloat(t);
      case 'less than': return parseFloat(a) < parseFloat(t);
      case 'is empty': return a === '';
      case 'is not empty': return a !== '';
      default: return false;
    }
  }

  /**
   * Processes a single workflow run, executing its actions in order.
   */
  private static async processRun(runId: string, workflow: any, payload: any) {
    const startTime = Date.now();
    let status = 'Success';
    let errorMessage = '';
    const executedActions: string[] = [];
    
    try {
      // Mark as In Progress
      await supabase.from('automation_runs').update({ status: 'In Progress' }).eq('id', runId);

      const actions = [...(workflow.automation_actions || [])].sort((a, b) => a.sort_order - b.sort_order);

      for (const action of actions) {
        console.log(`[AutomationEngine] Executing Action: ${action.action_type}`);
        
        await this.executeAction(action, payload);
        executedActions.push(action.action_type);
        
        // Handle explicit delays
        if (action.action_type === 'Delay Action') {
          const hours = action.metadata?.hours || 1;
          console.log(`[AutomationEngine] Delaying for ${hours} hours... (Simulated)`);
          await new Promise(r => setTimeout(r, 1500)); // Simulate delay for demo
        }
      }

      await supabase.from('automation_runs').update({ status: 'Completed' }).eq('id', runId);

    } catch (e: any) {
      console.error(`[AutomationEngine] Run ${runId} failed:`, e);
      status = 'Failed';
      errorMessage = e.message;
      await supabase.from('automation_runs').update({ status: 'Failed', retry_count: 1 }).eq('id', runId);
    } finally {
      // Log execution
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
      
      if (status === 'Success') {
        toast.success(`Workflow Executed: ${workflow.name}`);
      }
    }
  }

  /**
   * Executes a specific action.
   */
  private static async executeAction(action: any, payload: any) {
    const lead = payload.lead;
    if (!lead) return; // Most actions require a lead context for now

    switch (action.action_type) {
      case 'Create Task':
        await supabase.from('tasks').insert({
          lead_id: lead.id,
          title: action.metadata?.title || 'Automated Task',
          description: 'Generated by workflow',
          status: 'Pending',
          priority: 'High'
        });
        break;
      
      case 'Update Lead Status':
        if (action.metadata?.status) {
          await supabase.from('leads').update({ status: action.metadata.status }).eq('id', lead.id);
        }
        break;

      case 'Send Notification':
        await supabase.from('notifications').insert({
          user_id: lead.assigned_user, // send to assigned counselor
          title: action.metadata?.is_escalation ? 'ESCALATION ALERT' : 'Automated Alert',
          message: action.metadata?.message || `System notification regarding ${lead.full_name}`,
          type: 'alert',
          is_read: false,
          reference_id: lead.id,
          reference_type: 'lead'
        });
        break;
        
      case 'Generate AI Summary':
        // Generate an AI Summary (We could use AIService here, but for now we just log it)
        console.log('Generating AI Summary...');
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          type: 'Note',
          title: 'AI Summary Generated',
          description: 'The AI Assistant summarized the profile automatically.',
          created_by: lead.assigned_user
        });
        break;
        
      case 'Assign Counselor':
        // Simplified assignment logic
        console.log('Assigning Counselor...');
        break;
        
      case 'Send Email':
        if (action.metadata?.template_id && lead.email) {
          const { emailCoreService } = await import('../email/EmailService');
          
          // Get template
          const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', action.metadata.template_id)
            .single();
            
          if (template) {
            const vars = {
              student_name: lead.full_name || 'Student',
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
              recipientName: lead.full_name,
              subject: renderedSubject,
              body: renderedBody
            });
          }
        }
        break;

      case 'Send WhatsApp':
        if (action.metadata?.template_id && lead.phone) {
          const { whatsAppCoreService } = await import('../whatsapp/WhatsAppService');
          const convId = await whatsAppCoreService.getOrCreateConversation(lead.id, lead.phone, lead.full_name);
          
          const { data: template } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('id', action.metadata.template_id)
            .single();
            
          if (template) {
            // Simplified template replacement for demo
            const content = template.content.replace(/\{\{name\}\}/g, lead.full_name || 'Student')
                                            .replace(/\{\{course\}\}/g, lead.course || '')
                                            .replace(/\{\{university\}\}/g, lead.university || '');
            
            await whatsAppCoreService.sendMessage(convId, content, 'template', false, undefined, template.id);
          }
        }
        break;

      default:
        console.log(`[AutomationEngine] Unhandled action type: ${action.action_type}`);
    }
  }
}
