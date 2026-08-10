import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Zap, MessageSquare, Bot, Plus, Trash2, Save, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_TRIGGERS = [
  { id: 'lead.created', label: 'Lead Created' },
  { id: 'lead.qualified', label: 'Lead Qualified' },
  { id: 'admission.confirmed', label: 'Admission Confirmed' },
  { id: 'document.uploaded', label: 'Document Uploaded' },
  { id: 'payment.success', label: 'Payment Success' }
];

export default function AutomationBuilder() {
  const { user } = useAuth();
  
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(AVAILABLE_TRIGGERS[1].id);
  const [aiPrompt, setAiPrompt] = useState('Write a 2-sentence congratulatory WhatsApp message to {{name}} for qualifying for {{course}} at {{university}}.');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.activeOrganizationId) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select(`
          *,
          automation_actions (*)
        `)
        .eq('organization_id', user!.activeOrganizationId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast.error('Failed to load workflows: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    try {
      setIsSaving(true);
      
      // 1. Create Workflow
      const { data: workflow, error: wfError } = await supabase
        .from('automation_workflows')
        .insert({
          organization_id: user!.activeOrganizationId!,
          name: workflowName,
          trigger_event: selectedTrigger,
          status: 'active',
          created_by: user!.id
        })
        .select()
        .single();

      if (wfError) throw wfError;

      // 2. Create AI Action (Sort Order 1)
      const { error: aiError } = await supabase
        .from('automation_actions')
        .insert({
          workflow_id: workflow.id,
          action_type: 'ai_generate',
          metadata: { prompt: aiPrompt },
          sort_order: 1
        });

      if (aiError) throw aiError;

      // 3. Create WhatsApp Action (Sort Order 2)
      const { error: waError } = await supabase
        .from('automation_actions')
        .insert({
          workflow_id: workflow.id,
          action_type: 'whatsapp_send',
          metadata: { message_body: '{{ai_output}}' }, // Inject the output from step 1
          sort_order: 2
        });

      if (waError) throw waError;

      toast.success('Automation workflow created successfully!');
      setIsBuilding(false);
      setWorkflowName('');
      loadWorkflows();

    } catch (error: any) {
      toast.error('Failed to save workflow: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWorkflowStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('automation_workflows')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
      toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const { error } = await supabase
        .from('automation_workflows')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success('Workflow deleted');
    } catch (error: any) {
      toast.error('Failed to delete workflow');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading automations...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Builder</h1>
          <p className="text-muted-foreground mt-1">Design internal workflows using AI and external services.</p>
        </div>
        {!isBuilding && (
          <button
            onClick={() => setIsBuilding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        )}
      </div>

      {isBuilding && (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <input
              type="text"
              placeholder="Workflow Name (e.g., Congratulate Qualified Leads)"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground/50"
            />
          </div>
          
          <div className="p-8 space-y-8 bg-gradient-to-b from-background to-muted/20">
            
            {/* Trigger Node */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0 z-10 border-4 border-background">
                  <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-5 shadow-sm">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 bg-muted rounded uppercase tracking-wider">Trigger</span>
                    When this event happens...
                  </h3>
                  <select
                    value={selectedTrigger}
                    onChange={(e) => setSelectedTrigger(e.target.value)}
                    className="w-full md:w-1/2 p-2 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary/50"
                  >
                    {AVAILABLE_TRIGGERS.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.id})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="absolute left-6 top-12 bottom-[-2rem] w-0.5 bg-border/80 z-0"></div>
            </div>

            {/* AI Action Node */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 z-10 border-4 border-background">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-5 shadow-sm">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded uppercase tracking-wider">Action 1</span>
                    Generate AI Message
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use variables like <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{name}}`}</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{{course}}`}</code> to personalize the prompt.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>
              </div>
              <div className="absolute left-6 top-12 bottom-[-2rem] w-0.5 bg-border/80 z-0"></div>
            </div>

            {/* WhatsApp Action Node */}
            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 z-10 border-4 border-background">
                  <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-5 shadow-sm opacity-90">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded uppercase tracking-wider">Action 2</span>
                    Send via WhatsApp
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    The output from the AI will be injected automatically into the WhatsApp delivery queue.
                  </p>
                  <div className="mt-3 p-3 bg-muted/50 rounded border border-border/50 text-sm font-mono text-muted-foreground">
                    Message Body: {`{{ai_output}}`}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
            <button
              onClick={() => setIsBuilding(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={saveWorkflow}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4" />
                  Activate Workflow
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Existing Workflows */}
      {!isBuilding && workflows.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Active Automations</h2>
          <div className="grid grid-cols-1 gap-4">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-card border border-border rounded-lg p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium">{wf.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      wf.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {wf.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-orange-500" /> {wf.trigger_event}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-purple-500" /> AI Generate</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={wf.status === 'active'}
                      onChange={() => toggleWorkflowStatus(wf.id, wf.status)}
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <button 
                    onClick={() => deleteWorkflow(wf.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isBuilding && workflows.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/50">
          <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-medium">No automations yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Create your first AI workflow to automatically send personalized messages to students based on CRM events.
          </p>
          <button
            onClick={() => setIsBuilding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      )}
    </div>
  );
}
