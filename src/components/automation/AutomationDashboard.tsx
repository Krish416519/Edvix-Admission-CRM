import React, { useState, useEffect } from 'react';
import { 
  Workflow as WorkflowIcon, Plus, Play, Pause, Settings, MoreVertical, 
  Zap, Mail, MessageSquare, UserPlus, CheckSquare, 
  Bell, ArrowRight, Activity, Clock, ShieldAlert, Edit, Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { WorkflowBuilder } from './WorkflowBuilder';
import { ExecutionHistory } from './ExecutionHistory';
import { useAutomations } from '../../hooks/useAutomations';
import { Skeleton } from '../ui/Skeleton';

export function AutomationDashboard() {
  const { workflows, logs, isLoading, toggleWorkflowStatus, deleteWorkflow } = useAutomations();
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows');

  if (isCreating) {
    return <WorkflowBuilder onBack={() => setIsCreating(false)} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto w-full p-4">
        <Skeleton className="w-64 h-8 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    );
  }

  const activeCount = workflows.filter(w => w.status === 'active').length;
  const executionCount = logs.length;
  const successCount = logs.filter(l => l.status === 'Success').length;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <WorkflowIcon className="w-6 h-6 text-primary" />
            Automation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automatically manage lead assignments, follow-ups, and notifications.</p>
        </div>
        
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-sm">Active Workflows</h3>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-sm">Total Executions</h3>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{executionCount.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-sm">Successful Runs</h3>
            <CheckSquare className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{successCount.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted-foreground text-sm">Avg Execution Time</h3>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {logs.length ? Math.round(logs.reduce((acc, l) => acc + l.executionTimeMs, 0) / logs.length) : 0}ms
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('workflows')}
          className={cn(
            "pb-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'workflows' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          My Workflows
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "pb-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'workflows' ? "border-transparent text-muted-foreground hover:text-foreground" : "border-primary text-primary"
          )}
        >
          Execution History
        </button>
      </div>

      {activeTab === 'workflows' ? (
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <h2 className="font-semibold text-foreground">All Workflows</h2>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Search workflows..." 
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background w-64 text-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
          <div className="grid gap-4">
            {workflows.map(workflow => (
              <div 
                key={workflow.id} 
                className={cn(
                  "border rounded-xl p-5 transition-colors",
                  workflow.status === 'active' 
                    ? "border-border bg-background hover:border-primary/30" 
                    : "border-border/50 bg-muted/10 opacity-75"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      workflow.status === 'active' 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <WorkflowIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {workflow.name}
                        {workflow.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {workflow.isPrebuilt && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                            Prebuilt
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{workflow.description}</p>
                      
                      <div className="flex items-center gap-4 mt-4 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          Trigger: {workflow.trigger}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-border"></div>
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-blue-500" />
                          {workflow.actions?.length || 0} Actions
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleWorkflowStatus(workflow.id, workflow.status)}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors border",
                        workflow.status === 'active' ? "bg-primary border-primary" : "bg-muted border-border"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        workflow.status === 'active' ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    <button className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" onClick={() => deleteWorkflow(workflow.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                No workflows found.
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        <ExecutionHistory />
      )}
    </div>
  );
}
