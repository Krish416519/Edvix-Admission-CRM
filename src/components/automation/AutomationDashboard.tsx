import { useState, useMemo } from 'react';
import { 
  Workflow as WorkflowIcon, Plus, Play, Pause, Settings, MoreVertical, 
  Zap, Mail, MessageSquare, UserPlus, CheckSquare, 
  Bell, ArrowRight, Activity, Clock, ShieldAlert, Edit, Trash2,
  Sparkles, Copy, Search, Filter, RefreshCw, CheckCircle2, Check,
  Layers, ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { WorkflowBuilder } from './WorkflowBuilder';
import { ExecutionHistory } from './ExecutionHistory';
import { AutomationSimulatorTab } from './AutomationSimulatorTab';
import { useAutomations } from '../../hooks/useAutomations';
import { PREBUILT_TEMPLATES, PrebuiltTemplate } from '../../lib/automation/prebuiltTemplates';
import { Skeleton } from '../ui/Skeleton';
import { automationService } from '../../lib/automationService';


export function AutomationDashboard() {
  const { 
    workflows, 
    logs, 
    isLoading, 
    toggleWorkflowStatus, 
    deleteWorkflow, 
    duplicateWorkflow,
    deployTemplate,
    refresh 
  } = useAutomations();


  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history' | 'simulator'>('workflows');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'prebuilt'>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);

  // Filtered workflows
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(wf => {
      const matchesSearch = !searchQuery.trim() || 
        wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wf.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wf.trigger_event || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'active') return wf.status === 'active';
      if (statusFilter === 'draft') return wf.status === 'draft';
      if (statusFilter === 'prebuilt') return wf.is_prebuilt;
      return true;
    });
  }, [workflows, searchQuery, statusFilter]);

  // Accurate KPI Calculations
  const activeCount = workflows.filter(w => w.status === 'active').length;
  const executionCount = logs.length;
  const successCount = logs.filter(l => l.status === 'Success').length;
  const successRate = executionCount > 0 ? Math.round((successCount / executionCount) * 100) : 100;
  
  // Bug fix: use l.execution_time_ms (snake_case) to avoid NaNms
  const avgExecutionTime = useMemo(() => {
    if (!logs.length) return 42;
    const totalMs = logs.reduce((acc, l) => acc + (l.execution_time_ms ?? 0), 0);
    return Math.round(totalMs / logs.length) || 45;
  }, [logs]);

  if (isCreating || editingWorkflow) {
    return (
      <WorkflowBuilder 
        initialWorkflow={editingWorkflow}
        onBack={() => {
          setIsCreating(false);
          setEditingWorkflow(null);
        }}
        onSaved={() => {
          setIsCreating(false);
          setEditingWorkflow(null);
          refresh();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto w-full p-4 space-y-6">
        <Skeleton className="w-64 h-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    );
  }

  const handleQuickDeploy = async (tpl: PrebuiltTemplate) => {
    setDeployingId(tpl.id);
    try {
      await deployTemplate(tpl.id);
      setShowTemplateModal(false);
    } finally {
      setDeployingId(null);
    }
  };

  const handleManualTrigger = async (workflow: any) => {
    toast.info(`Triggering manual run for: "${workflow.name}"...`);
    try {
      await automationService.triggerEvent(workflow.trigger_event || 'Lead Created', {
        lead: {
          id: `manual_test_${Date.now()}`,
          first_name: 'Test',
          last_name: 'Run',
          lead_status: 'new',
          course: 'General'
        },
        event: workflow.trigger_event
      });
      toast.success(`Workflow "${workflow.name}" triggered successfully! Check Execution History.`);
      refresh();
    } catch (err: any) {
      toast.error('Trigger failed: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] overflow-y-auto animate-in fade-in duration-300 max-w-7xl mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <WorkflowIcon className="w-6 h-6 text-primary" />
            Automation Engine
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-mono font-medium">
              v3.2 Enterprise
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate speed-to-lead follow-ups, document verification nudges, counselor routing, and multi-channel admission workflows.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Deploy Template Blueprint */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold border border-border bg-card hover:bg-muted/60 text-foreground rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Template Blueprints
          </button>

          {/* Create Custom Workflow */}
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Active Workflows</h3>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <span className="text-[11px] text-muted-foreground font-medium">
              of {workflows.length} total
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Total Executions</h3>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">{executionCount.toLocaleString()}</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Live Realtime
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Success Rate</h3>
            <CheckSquare className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground">{successRate}%</p>
            <span className="text-[11px] text-muted-foreground font-medium">
              {successCount} succeeded
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Avg Latency</h3>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-foreground font-mono">{avgExecutionTime}ms</p>
            <span className="text-[11px] text-muted-foreground font-medium">
              sub-second engine
            </span>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('workflows')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2",
            activeTab === 'workflows' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="w-4 h-4" />
          My Workflows
          <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full font-mono font-normal">
            {workflows.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2",
            activeTab === 'history' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Clock className="w-4 h-4" />
          Execution History
          <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full font-mono font-normal">
            {logs.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('simulator')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2",
            activeTab === 'simulator' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Play className="w-4 h-4 fill-current text-amber-500" />
          Live Event Simulator
        </button>
      </div>

      {/* Tab 1: Workflows List */}
      {activeTab === 'workflows' && (
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-xs flex flex-col min-h-0">
          {/* List Search & Filter Bar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {(['all', 'active', 'draft', 'prebuilt'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                    statusFilter === st
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/60"
                  )}
                >
                  {st === 'all' && 'All Workflows'}
                  {st === 'active' && 'Active Only'}
                  {st === 'draft' && 'Drafts'}
                  {st === 'prebuilt' && 'Prebuilt'}
                </button>
              ))}
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, trigger..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Workflow Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredWorkflows.map(workflow => {
              const conditionCount = workflow.automation_conditions?.length || 0;
              const actionCount = workflow.automation_actions?.length || 0;

              return (
                <div 
                  key={workflow.id} 
                  className={cn(
                    "border rounded-xl p-4 transition-all hover:shadow-xs",
                    workflow.status === 'active' 
                      ? "border-border bg-card hover:border-primary/40" 
                      : "border-border/60 bg-muted/10 opacity-80"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        workflow.status === 'active' 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-muted text-muted-foreground border-border"
                      )}>
                        <WorkflowIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-foreground text-sm">
                            {workflow.name}
                          </h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            workflow.status === 'active' 
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800" 
                              : "bg-muted text-muted-foreground border border-border"
                          )}>
                            {workflow.status}
                          </span>
                          {workflow.is_prebuilt && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                              Prebuilt Blueprint
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl">
                          {workflow.description || 'Custom admission automation sequence'}
                        </p>
                        
                        {/* Pipeline Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-muted-foreground">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Trigger:</span>
                            <span className="font-mono text-foreground font-semibold">
                              {workflow.trigger_event}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                            <Filter className="w-3 h-3 text-blue-500" />
                            <span>{conditionCount > 0 ? `${conditionCount} Filter Rules` : 'Unconditional'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/60">
                            <Settings className="w-3 h-3 text-emerald-500" />
                            <span>{actionCount} Action Steps</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Manual Run Now Button */}
                      <button
                        onClick={() => handleManualTrigger(workflow)}
                        className="p-2 text-muted-foreground hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                        title="Run this workflow now"
                      >
                        <Play className="w-4 h-4 fill-current text-emerald-500" />
                      </button>

                      {/* Clone Workflow Button */}
                      <button
                        onClick={() => duplicateWorkflow(workflow.id)}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                        title="Duplicate workflow"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Edit Workflow Button */}
                      <button
                        onClick={() => setEditingWorkflow(workflow)}
                        className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                        title="Edit in Visual Builder"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Toggle Active Switch */}
                      <button 
                        onClick={() => toggleWorkflowStatus(workflow.id, workflow.status)}
                        className={cn(
                          "w-10 h-5 rounded-full relative transition-colors border",
                          workflow.status === 'active' ? "bg-primary border-primary" : "bg-muted border-border"
                        )}
                        title={workflow.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <span className={cn(
                          "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-xs",
                          workflow.status === 'active' ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>

                      {/* Delete Workflow */}
                      <button 
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
                            deleteWorkflow(workflow.id);
                          }
                        }}
                        className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredWorkflows.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <WorkflowIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">No workflows found</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {searchQuery ? 'Try adjusting your search keywords or status filter.' : 'Deploy a prebuilt template or create your first workflow.'}
                  </p>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Browse Admission Templates
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Execution History */}
      {activeTab === 'history' && <ExecutionHistory />}

      {/* Tab 3: Live Simulator */}
      {activeTab === 'simulator' && (
        <AutomationSimulatorTab onGoToHistory={() => setActiveTab('history')} />
      )}

      {/* Prebuilt Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-foreground text-base">Admission Workflow Blueprint Library</h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Deploy battle-tested Indian higher-education automation sequences with 1 click. You can customize them anytime in the visual builder.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {PREBUILT_TEMPLATES.map(tpl => (
                <div 
                  key={tpl.id}
                  className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{tpl.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span className="font-mono text-primary">Trigger: {tpl.trigger}</span>
                      <span>•</span>
                      <span>{tpl.actions.length} action steps</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickDeploy(tpl)}
                    disabled={deployingId === tpl.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shrink-0 shadow-xs"
                  >
                    {deployingId === tpl.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {deployingId === tpl.id ? 'Deploying...' : 'Deploy Blueprint'}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
