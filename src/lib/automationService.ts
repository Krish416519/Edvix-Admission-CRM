import { AutomationEngine } from './automation/AutomationEngine';

export const automationService = {
  // We keep this for backward compatibility with older components
  // but they should be migrated to useAutomations() hook
  getWorkflows() { return []; },
  getLogs() { return []; },
  saveWorkflow(_workflow: any) { console.warn('Use Supabase to save workflows directly'); },
  deleteWorkflow(_id: string) { console.warn('Use Supabase to delete workflows directly'); },

  // The main entry point
  async triggerEvent(triggerName: string, payload: any) {
    await AutomationEngine.triggerEvent(triggerName, payload);
  }
};
