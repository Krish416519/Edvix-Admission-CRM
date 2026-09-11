import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { automationService, WorkflowRecord, ExecutionLogRecord } from '../lib/automationService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export function useAutomations() {
  const { user } = useAuth();
  // Canonical org source: user.activeOrganizationId from authenticated context
  const orgId = user?.activeOrganizationId || user?.organizations?.[0]?.id;

  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    try {
      const [wfs, executionLogs] = await Promise.all([
        automationService.getWorkflows(orgId),
        automationService.getExecutionLogs({ limit: 50 }),
      ]);
      setWorkflows(wfs);
      setLogs(executionLogs);
    } catch (e: any) {
      console.error('Error fetching automations', e);
      toast.error('Failed to load automations');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAutomations();

    const channel = supabase.channel('automations-live-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_execution_logs' }, () => {
        automationService.getExecutionLogs({ limit: 50 }).then(setLogs);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_workflows' }, () => {
        if (orgId) automationService.getWorkflows(orgId).then(setWorkflows);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAutomations, orgId]);

  const toggleWorkflowStatus = async (id: string, currentStatus: string) => {
    if (!orgId) { toast.error('Organization context required'); return; }
    const success = await automationService.toggleWorkflowStatus(id, currentStatus, orgId);
    if (success) {
      const next = currentStatus === 'active' ? 'inactive' : 'active';
      toast.success(`Workflow set to ${next}`);
      await fetchAutomations();
    } else {
      toast.error('Failed to update workflow status');
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!orgId) { toast.error('Organization context required'); return; }
    const success = await automationService.deleteWorkflow(id, orgId);
    if (success) {
      toast.success('Workflow deleted successfully');
      await fetchAutomations();
    } else {
      toast.error('Failed to delete workflow');
    }
  };

  const duplicateWorkflow = async (id: string) => {
    if (!orgId) { toast.error('Organization context required'); return null; }
    const cloned = await automationService.duplicateWorkflow(id, orgId);
    if (cloned) {
      toast.success(`Created copy: "${cloned.name}"`);
      await fetchAutomations();
      return cloned;
    } else {
      toast.error('Failed to clone workflow');
      return null;
    }
  };

  const deployTemplate = async (templateId: string) => {
    if (!orgId) { toast.error('Organization context required'); return null; }
    const deployed = await automationService.deployTemplate(templateId, orgId);
    if (deployed) {
      toast.success(`Deployed template: "${deployed.name}"`);
      await fetchAutomations();
      return deployed;
    } else {
      toast.error('Failed to deploy template');
      return null;
    }
  };

  const saveWorkflow = async (workflow: any) => {
    if (!orgId) { toast.error('Organization context required'); return null; }
    const res = await automationService.saveWorkflow(workflow, orgId);
    if (res.success && res.workflow) {
      toast.success('Workflow saved and synchronized');
      await fetchAutomations();
      return res.workflow;
    } else {
      toast.error(res.error || 'Failed to save workflow');
      return null;
    }
  };

  return {
    workflows,
    logs,
    orgId,
    isLoading,
    toggleWorkflowStatus,
    deleteWorkflow,
    duplicateWorkflow,
    deployTemplate,
    saveWorkflow,
    refresh: fetchAutomations
  };
}
