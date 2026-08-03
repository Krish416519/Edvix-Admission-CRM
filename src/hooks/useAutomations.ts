import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function useAutomations() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomations = async () => {
    try {
      // 1. Fetch workflows
      const { data: wfData, error: wfError } = await supabase
        .from('automation_workflows')
        .select(`
          *,
          automation_conditions(*),
          automation_actions(*)
        `)
        .order('created_at', { ascending: false });

      if (wfError) throw wfError;
      setWorkflows(wfData || []);

      // 2. Fetch logs (last 50)
      const { data: logsData, error: logsError } = await supabase
        .from('automation_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (logsError) throw logsError;
      setLogs(logsData || []);

      // 3. Fetch triggers
      const { data: triggerData } = await supabase
        .from('automation_triggers')
        .select('*')
        .eq('is_active', true);
      
      setTriggers(triggerData || []);

    } catch (e: any) {
      console.error('Error fetching automations', e);
      toast.error('Failed to load automations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();

    // Setup realtime subscription for logs
    const channel = supabase.channel('automations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_execution_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 50));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_workflows' }, () => {
        fetchAutomations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleWorkflowStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('automation_workflows').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Workflow ${newStatus}`);
      fetchAutomations();
    }
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from('automation_workflows').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete workflow');
    } else {
      toast.success('Workflow deleted');
      fetchAutomations();
    }
  };

  const saveWorkflow = async (workflow: any) => {
    try {
      let wfId = workflow.id;

      if (!wfId) {
        // Insert workflow
        const { data, error } = await supabase.from('automation_workflows').insert({
          name: workflow.name,
          description: workflow.description,
          trigger_event: workflow.trigger,
          status: workflow.status || 'draft'
        }).select('id').single();

        if (error) throw error;
        wfId = data.id;
      } else {
        // Update workflow
        const { error } = await supabase.from('automation_workflows').update({
          name: workflow.name,
          description: workflow.description,
          trigger_event: workflow.trigger,
          status: workflow.status
        }).eq('id', wfId);

        if (error) throw error;
      }

      // Sync Actions
      await supabase.from('automation_actions').delete().eq('workflow_id', wfId);
      if (workflow.actions && workflow.actions.length > 0) {
        const actionInserts = workflow.actions.map((a: any, i: number) => ({
          workflow_id: wfId,
          action_type: a.type,
          metadata: a.metadata || {},
          sort_order: i
        }));
        await supabase.from('automation_actions').insert(actionInserts);
      }

      // Sync Conditions
      await supabase.from('automation_conditions').delete().eq('workflow_id', wfId);
      if (workflow.conditions && workflow.conditions.length > 0) {
        const conditionInserts = workflow.conditions.map((c: any, i: number) => ({
          workflow_id: wfId,
          field: c.field,
          operator: c.operator,
          value_text: c.value,
          logic: c.logic || 'AND',
          sort_order: i
        }));
        await supabase.from('automation_conditions').insert(conditionInserts);
      }

      toast.success('Workflow saved successfully');
      fetchAutomations();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save workflow: ' + e.message);
    }
  };

  return {
    workflows,
    logs,
    triggers,
    isLoading,
    toggleWorkflowStatus,
    deleteWorkflow,
    saveWorkflow,
    refresh: fetchAutomations
  };
}
