import { supabase } from './supabase';
import { AutomationEngine } from './automation/AutomationEngine';
import { PREBUILT_TEMPLATES, PrebuiltTemplate } from './automation/prebuiltTemplates';
import { logger } from './logger';

// No DEFAULT_ORG_ID — org context must be provided by the caller.
// RLS on automation_workflows enforces is_member_of(organization_id) server-side.

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'draft' | 'inactive' | 'testing';
  trigger_event: string;
  trigger_metadata?: Record<string, any>;
  is_prebuilt: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  automation_conditions?: any[];
  automation_actions?: any[];
}

export interface ExecutionLogRecord {
  id: string;
  workflow_id: string;
  run_id?: string | null;
  trigger_event: string;
  status: 'Success' | 'Failed' | 'In Progress' | 'Delayed';
  error_message?: string | null;
  affected_lead_id?: string | null;
  actions_executed?: string[];
  execution_time_ms: number;
  created_at: string;
  automation_workflows?: { name: string } | null | any;
  automation_runs?: { status: string; retry_count?: number } | null | any;
}

export const automationService = {
  async getWorkflows(orgId?: string): Promise<WorkflowRecord[]> {
    try {
      let query = supabase
        .from('automation_workflows')
        .select(`*, automation_conditions(*), automation_actions(*)`)
        .order('created_at', { ascending: false });
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      logger.error('[automationService] getWorkflows error:', { message: err.message, code: err.code });
      return [];
    }
  },

  async saveWorkflow(workflow: any, orgId: string): Promise<{ success: boolean; workflow?: WorkflowRecord; error?: string }> {
    if (!orgId) return { success: false, error: 'Organization context required' };
    try {
      let wfId = workflow.id;
      const isNew = !wfId || wfId.startsWith('wf_') || wfId.startsWith('tpl_');
      const triggerEvent = workflow.trigger_event || workflow.trigger || 'Lead Created';
      const status = (workflow.status || 'active').toLowerCase();
      let savedWorkflowId = wfId;

      if (isNew) {
        const { data: newWf, error: wfErr } = await supabase
          .from('automation_workflows')
          .insert({
            name: workflow.name,
            description: workflow.description || null,
            trigger_event: triggerEvent,
            trigger_metadata: workflow.trigger_metadata || workflow.triggerMetadata || {},
            status: status === 'testing' ? 'draft' : status,
            is_prebuilt: Boolean(workflow.is_prebuilt || workflow.isPrebuilt),
            organization_id: orgId
          })
          .select()
          .single();
        if (wfErr) throw wfErr;
        savedWorkflowId = newWf.id;
      } else {
        const { error: updErr } = await supabase
          .from('automation_workflows')
          .update({
            name: workflow.name,
            description: workflow.description || null,
            trigger_event: triggerEvent,
            trigger_metadata: workflow.trigger_metadata || workflow.triggerMetadata || {},
            status: status === 'testing' ? 'draft' : status,
            updated_at: new Date().toISOString()
          })
          .eq('id', wfId)
          .eq('organization_id', orgId);
        if (updErr) throw updErr;
      }

      await supabase.from('automation_conditions').delete().eq('workflow_id', savedWorkflowId);
      const rawConditions = workflow.conditions || workflow.conditions_tree?.conditions || [];
      if (Array.isArray(rawConditions) && rawConditions.length > 0) {
        const conditionInserts = rawConditions.map((c: any, index: number) => ({
          workflow_id: savedWorkflowId,
          field: c.field || 'lead.status',
          operator: (c.operator || 'equals').replace(/ /g, '_'),
          value_text: String(c.value || c.value_text || ''),
          logic: c.logic || 'AND',
          sort_order: index + 1
        }));
        const { error: condErr } = await supabase.from('automation_conditions').insert(conditionInserts);
        if (condErr) logger.warn('[automationService] conditions insert warning:', { message: condErr.message });
      }

      await supabase.from('automation_actions').delete().eq('workflow_id', savedWorkflowId);
      const rawActions = workflow.actions || workflow.automation_actions || [];
      if (Array.isArray(rawActions) && rawActions.length > 0) {
        const actionInserts = rawActions.map((a: any, index: number) => ({
          workflow_id: savedWorkflowId,
          action_type: a.type || a.action_type || 'Create Task',
          metadata: a.metadata || {},
          sort_order: index + 1
        }));
        const { error: actErr } = await supabase.from('automation_actions').insert(actionInserts);
        if (actErr) logger.warn('[automationService] actions insert warning:', { message: actErr.message });
      }

      const { data: fullWf } = await supabase
        .from('automation_workflows')
        .select(`*, automation_conditions(*), automation_actions(*)`)
        .eq('id', savedWorkflowId)
        .single();
      return { success: true, workflow: fullWf };
    } catch (err: any) {
      logger.error('[automationService] saveWorkflow error:', { message: err.message });
      return { success: false, error: err.message || 'Failed to save workflow' };
    }
  },

  async toggleWorkflowStatus(id: string, currentStatus: string, orgId: string): Promise<boolean> {
    if (!orgId) return false;
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('automation_workflows')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', orgId);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('[automationService] toggleWorkflowStatus error:', { id, message: err.message });
      return false;
    }
  },

  async deleteWorkflow(id: string, orgId: string): Promise<boolean> {
    if (!orgId) return false;
    try {
      await supabase.from('automation_conditions').delete().eq('workflow_id', id);
      await supabase.from('automation_actions').delete().eq('workflow_id', id);
      const { error } = await supabase
        .from('automation_workflows')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logger.error('[automationService] deleteWorkflow error:', { id, message: err.message });
      return false;
    }
  },

  async duplicateWorkflow(id: string, orgId: string): Promise<WorkflowRecord | null> {
    if (!orgId) return null;
    try {
      const { data: source, error: srcErr } = await supabase
        .from('automation_workflows')
        .select(`*, automation_conditions(*), automation_actions(*)`)
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();
      if (srcErr || !source) throw srcErr || new Error('Workflow not found');
      const clonePayload = {
        name: `${source.name} (Copy)`,
        description: source.description,
        trigger_event: source.trigger_event,
        trigger_metadata: source.trigger_metadata,
        status: 'draft',
        is_prebuilt: false,
        conditions: source.automation_conditions?.map((c: any) => ({ field: c.field, operator: c.operator, value: c.value_text, logic: c.logic })),
        actions: source.automation_actions?.map((a: any) => ({ type: a.action_type, metadata: a.metadata }))
      };
      const result = await this.saveWorkflow(clonePayload, orgId);
      return result.workflow || null;
    } catch (err: any) {
      logger.error('[automationService] duplicateWorkflow error:', { id, message: err.message });
      return null;
    }
  },

  async getExecutionLogs(options: { limit?: number; status?: string; search?: string } = {}): Promise<ExecutionLogRecord[]> {
    try {
      let query = supabase
        .from('automation_execution_logs')
        .select(`
          id, workflow_id, run_id, trigger_event, status,
          error_message, affected_lead_id, actions_executed,
          execution_time_ms, created_at,
          automation_workflows ( name, organization_id ),
          automation_runs ( status, retry_count )
        `)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);
      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      let results: ExecutionLogRecord[] = (data || []).map((l: any) => ({
        ...l,
        automation_workflows: Array.isArray(l.automation_workflows) ? l.automation_workflows[0] : l.automation_workflows,
        // Strip payload from runs — never expose raw payload in log list (PII risk)
        automation_runs: (() => {
          const r = Array.isArray(l.automation_runs) ? l.automation_runs[0] : l.automation_runs;
          if (!r) return null;
          return { status: r.status, retry_count: r.retry_count };
        })()
      }));
      if (options.search && options.search.trim()) {
        const term = options.search.toLowerCase();
        results = results.filter(l =>
          (l.automation_workflows?.name || '').toLowerCase().includes(term) ||
          l.trigger_event.toLowerCase().includes(term) ||
          (l.error_message || '').toLowerCase().includes(term)
        );
      }
      return results;
    } catch (err: any) {
      logger.error('[automationService] getExecutionLogs error:', { message: err.message });
      return [];
    }
  },

  dryRunWorkflow(workflow: any, sampleLead?: any): {
    success: boolean; triggerMatched: boolean;
    conditionsEvaluated: Array<{ field: string; operator: string; expected: string; actual: any; passed: boolean }>;
    allConditionsPassed: boolean;
    actionsSimulated: Array<{ step: number; actionType: string; status: 'simulated' | 'skipped'; details: string }>;
    logs: string[];
  } {
    const logs: string[] = [];
    const lead = sampleLead || {
      id: 'demo-lead-101', first_name: 'Sample', last_name: 'Applicant',
      lead_status: 'new', status: 'new', course: 'B.Tech Computer Science',
      lead_score: 85, ai_score: 85, city: 'Pune', budget: '₹8,00,000'
    };
    logs.push(`Evaluating Trigger: "${workflow.trigger_event || workflow.trigger}" against sample lead`);
    const rawConditions = workflow.conditions || workflow.conditions_tree?.conditions || [];
    const conditionsEvaluated = rawConditions.map((cond: any) => {
      const field = cond.field || 'lead.status';
      let actual: any = null;
      if (field.includes('status')) actual = lead.lead_status || lead.status;
      else if (field.includes('score')) actual = lead.lead_score || lead.ai_score;
      else if (field.includes('course')) actual = lead.course;
      else if (field.includes('city')) actual = lead.city;
      else if (field.includes('budget')) actual = lead.budget;
      else actual = lead[field.replace('lead.', '')] ?? null;
      const op = (cond.operator || 'equals').replace(/ /g, '_');
      const expected = String(cond.value || cond.value_text || '');
      let passed = false;
      const a = String(actual || '').toLowerCase();
      const e = expected.toLowerCase();
      switch (op) {
        case 'equals': passed = a === e; break;
        case 'not_equals': passed = a !== e; break;
        case 'contains': passed = a.includes(e); break;
        case 'greater_than': passed = parseFloat(a) > parseFloat(e); break;
        case 'less_than': passed = parseFloat(a) < parseFloat(e); break;
        case 'is_not_empty': passed = a !== ''; break;
        case 'is_empty': passed = a === ''; break;
        default: passed = a === e;
      }
      logs.push(`Condition [${field} ${op} "${expected}"]: => ${passed ? 'PASSED' : 'FAILED'}`);
      return { field, operator: op, expected, actual, passed };
    });
    const allConditionsPassed = conditionsEvaluated.length === 0 || conditionsEvaluated.every((c: any) => c.passed);
    const rawActions = workflow.actions || workflow.automation_actions || [];
    const actionsSimulated = rawActions.map((action: any, i: number) => {
      const actionType = action.type || action.action_type || 'Action';
      if (!allConditionsPassed) return { step: i + 1, actionType, status: 'skipped' as const, details: 'Skipped due to failed conditions' };
      let details = `Simulated execution of ${actionType}`;
      if (actionType === 'Send WhatsApp') details = `WhatsApp template queued (template_id required in metadata)`;
      else if (actionType === 'Send Email') details = `Email dispatch simulated (template_id required in metadata)`;
      else if (actionType === 'Create Task') details = `High-priority counselor task would be created`;
      else if (actionType === 'Assign Counselor') details = `Least-loaded active counselor would be selected and assigned`;
      else if (actionType === 'Update Lead Status') details = `Status would be updated to "${action.metadata?.status || 'In Progress'}"`;
      else if (actionType === 'Delay Action') details = `PREVIEW ONLY — real delay requires backend job queue`;
      logs.push(`Step ${i + 1} [${actionType}]: ${details}`);
      return { step: i + 1, actionType, status: 'simulated' as const, details };
    });
    return { success: true, triggerMatched: true, conditionsEvaluated, allConditionsPassed, actionsSimulated, logs };
  },

  async triggerEvent(triggerName: string, payload: any): Promise<void> {
    await AutomationEngine.triggerEvent(triggerName, payload);
  },

  getPrebuiltTemplates(): PrebuiltTemplate[] {
    return PREBUILT_TEMPLATES;
  },

  async deployTemplate(templateId: string, orgId: string): Promise<WorkflowRecord | null> {
    if (!orgId) { logger.error('[automationService] deployTemplate: orgId required'); return null; }
    const tpl = PREBUILT_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return null;
    const payload = {
      name: tpl.name, description: tpl.description,
      trigger_event: tpl.trigger, status: 'active', is_prebuilt: true,
      conditions: tpl.conditions,
      actions: tpl.actions.map(a => ({ type: a.type, metadata: a.metadata }))
    };
    const res = await this.saveWorkflow(payload, orgId);
    return res.workflow || null;
  }
};
