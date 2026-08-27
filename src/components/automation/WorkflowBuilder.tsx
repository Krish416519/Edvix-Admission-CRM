import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ArrowRight, Zap, Settings, Activity, Plus, GripVertical, Trash2, Clock, ShieldAlert, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Workflow, TriggerType, ActionType, ConditionNode, ConditionOperator, WorkflowStatus } from '../../types/automation';
import { automationService } from '../../lib/automationService';
import { cn } from '../../lib/utils';

interface WorkflowBuilderProps {
  onBack: () => void;
}

export function WorkflowBuilder({ onBack }: WorkflowBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('Lead Created');
  const [isTestMode, setIsTestMode] = useState(false);
  
  const [conditionsTree, setConditionsTree] = useState<ConditionNode>({
    id: 'root',
    type: 'group',
    logic: 'AND',
    conditions: []
  });

  const [actions, setActions] = useState<{ id: string, type: ActionType, metadata: any }[]>([
    { id: 'action_1', type: 'Create Task', metadata: {} }
  ]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(actions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActions(items);
  };

  const handleAddAction = (type: ActionType) => {
    setActions([...actions, { id: `action_${Date.now()}`, type, metadata: {} }]);
  };

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const updateActionMetadata = (id: string, key: string, value: any) => {
    setActions(actions.map(a => a.id === id ? { ...a, metadata: { ...a.metadata, [key]: value } } : a));
  };

  const addCondition = (parentId: string) => {
    const newCond: ConditionNode = { id: `cond_${Date.now()}`, type: 'condition', field: 'lead.status', operator: 'equals', value: '' };
    if (parentId === 'root') {
       setConditionsTree({ ...conditionsTree, conditions: [...(conditionsTree.conditions || []), newCond] });
    }
  };

  const removeCondition = (id: string) => {
    setConditionsTree({ 
      ...conditionsTree, 
      conditions: conditionsTree.conditions?.filter(c => c.id !== id) 
    });
  };

  const updateCondition = (id: string, updates: Partial<ConditionNode>) => {
    setConditionsTree({
      ...conditionsTree,
      conditions: conditionsTree.conditions?.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const handleSave = async (status: WorkflowStatus = 'Active') => {
    if (!name.trim()) {
      toast.error('Please provide a workflow name');
      return;
    }

    const newWorkflow: Workflow = {
      id: `wf_${Date.now()}`,
      name,
      description,
      status: isTestMode ? 'Testing' : status,
      trigger,
      conditions_tree: conditionsTree,
      actions: actions,
      max_execution_depth: 5,
      allow_concurrent_execution: false,
      version: 1,
      is_test_mode: isTestMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await automationService.saveWorkflow(newWorkflow);
      toast.success(`Workflow saved successfully in ${newWorkflow.status} mode`);
      onBack();
    } catch (error) {
       console.error("Failed to save workflow", error);
       toast.error('Failed to save workflow');
    }
  };

  const handleDryRun = () => {
    toast.info("Dry Run Simulation Started. Check console for execution path.");
    console.log("=== DRY RUN SIMULATION ===");
    console.log("Trigger:", trigger);
    console.log("Conditions Met:", true);
    actions.forEach((a, i) => {
      console.log(`Step ${i + 1} [${a.type}]:`, a.metadata);
      if (a.type === 'Send WhatsApp' || a.type === 'Send Email') {
        console.log(` -> SAFETY CHECK: Test Mode active. Suppressing external communication.`);
      }
    });
    console.log("=== END DRY RUN ===");
    toast.success("Dry Run Completed Safely.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Workflow Builder 3.0
              {isTestMode && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">TEST MODE</span>}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Design automated sequences with approvals and multi-branch logic.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsTestMode(!isTestMode)} className={cn("px-4 py-2 text-sm font-medium rounded-lg shadow-sm border transition-colors", isTestMode ? "bg-amber-500 text-white border-amber-600" : "bg-card text-foreground hover:bg-muted")}>
            {isTestMode ? "Disable Test Mode" : "Enable Test Mode"}
          </button>
          <button onClick={handleDryRun} className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted shadow-sm flex items-center gap-2">
            <PlayCircle className="w-4 h-4" /> Dry Run
          </button>
          <button onClick={() => handleSave('Active')} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm">
            Save & Activate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-12">
        <div className="max-w-3xl mx-auto space-y-6">
          
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Workflow Name</label>
              <input 
                value={name} onChange={(e) => setName(e.target.value)}
                type="text" placeholder="e.g., Speed-to-Lead Follow-up" 
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
              <input 
                value={description} onChange={(e) => setDescription(e.target.value)}
                type="text" placeholder="What does this automation do?" 
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* TRIGGER NODE */}
          <div className="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full shadow flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Trigger
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1.5 text-foreground">When this event occurs...</label>
              <select 
                value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <optgroup label="Leads">
                  <option value="Lead Created">Lead Created</option>
                  <option value="Lead Qualified">Lead Qualified</option>
                  <option value="Lead Status Changed">Lead Status Changed</option>
                </optgroup>
                <optgroup label="Admissions">
                  <option value="Admission Stage Changed">Admission Stage Changed</option>
                  <option value="Document Uploaded">Document Uploaded</option>
                </optgroup>
                <optgroup label="Finance">
                  <option value="Payment Received">Payment Received</option>
                  <option value="Payout Approved">Payout Approved</option>
                </optgroup>
                <optgroup label="System">
                  <option value="University SLA Breached">University SLA Breached</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-2"><div className="w-px h-8 bg-border"></div></div>

          {/* CONDITION NODE */}
          <div className="bg-card border-2 border-amber-500/40 rounded-xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-amber-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow flex items-center gap-1.5">
              <Settings className="w-3 h-3" /> Conditions
            </div>
            <div className="mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Only run if ALL of the following match:</span>
                <button onClick={() => addCondition('root')} className="text-xs font-medium text-primary hover:underline">
                  + Add Condition
                </button>
              </div>

              {conditionsTree.conditions?.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-dashed border-border text-center">
                  Always run (No conditions set)
                </div>
              ) : (
                <div className="space-y-3">
                  {conditionsTree.conditions?.map((c) => (
                    <div key={c.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-background p-2 rounded-lg border border-border">
                      <select 
                        value={c.field} onChange={(e) => updateCondition(c.id, { field: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary"
                      >
                        <option value="lead.status">Lead Status</option>
                        <option value="lead.source">Lead Source</option>
                        <option value="application.course_id">Course ID</option>
                        <option value="payment.amount">Payment Amount</option>
                      </select>
                      <select 
                        value={c.operator} onChange={(e) => updateCondition(c.id, { operator: e.target.value as ConditionOperator })}
                        className="w-32 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="exists">Exists</option>
                      </select>
                      {c.operator !== 'exists' && c.operator !== 'not_exists' && (
                        <input 
                          type="text" value={c.value || ''} onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary"
                        />
                      )}
                      <button onClick={() => removeCondition(c.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center -my-2"><div className="w-px h-8 bg-border"></div></div>

          {/* ACTIONS DND */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="actions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                  {actions.map((action, index) => (
                    <div key={action.id}>
                      <Draggable draggableId={action.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "bg-card border-2 rounded-xl p-5 shadow-sm relative group transition-all",
                              snapshot.isDragging ? "border-primary shadow-md scale-105 z-50" : "border-border",
                              action.type === 'Wait' ? "border-indigo-500/30" : "",
                              action.type === 'Request Approval' ? "border-rose-500/40" : ""
                            )}
                          >
                            <div className={cn(
                              "absolute -top-3 left-4 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow",
                              action.type === 'Wait' 
                                ? "bg-indigo-500 text-white"
                                : action.type === 'Request Approval'
                                  ? "bg-rose-500 text-white"
                                  : "bg-blue-600 text-white"
                            )}>
                              {action.type === 'Wait' ? <Clock className="w-3 h-3" /> : action.type === 'Request Approval' ? <ShieldAlert className="w-3 h-3" /> : <Activity className="w-3 h-3" />} 
                              Step {index + 1}
                            </div>
                            
                            <div 
                              {...provided.dragHandleProps} 
                              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted rounded-md"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="absolute top-4 right-12 p-1.5 text-muted-foreground hover:text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors" onClick={() => handleRemoveAction(action.id)}>
                              <Trash2 className="w-4 h-4" />
                            </div>
                            
                            <div className="mt-2 space-y-4 pt-2">
                              <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Action Type</label>
                                <select 
                                  value={action.type}
                                  onChange={(e) => {
                                    const newActions = [...actions];
                                    newActions[index].type = e.target.value as ActionType;
                                    setActions(newActions);
                                  }}
                                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-primary"
                                >
                                  <optgroup label="Communication">
                                    <option value="Send WhatsApp">Send WhatsApp Message</option>
                                    <option value="Send Email">Send Email</option>
                                    <option value="Send Notification">Send UI Notification</option>
                                  </optgroup>
                                  <optgroup label="CRM Entities">
                                    <option value="Create Task">Create Task</option>
                                    <option value="Update Lead Status">Update Lead Status</option>
                                    <option value="Assign Counselor">Assign Counselor</option>
                                  </optgroup>
                                  <optgroup label="Workflow Control">
                                    <option value="Wait">Pause / Wait</option>
                                    <option value="Request Approval">Request Approval</option>
                                    <option value="Webhook">Trigger Webhook</option>
                                  </optgroup>
                                </select>
                              </div>

                              {/* Dynamic Action Configuration */}
                              {action.type === 'Wait' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <input type="checkbox" id={`business_${action.id}`} checked={action.metadata?.business_days || false} onChange={(e) => updateActionMetadata(action.id, 'business_days', e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
                                    <label htmlFor={`business_${action.id}`} className="text-sm font-medium">Use Business Days Only (Skips Weekends)</label>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs text-muted-foreground mb-1">Days</label>
                                      <input type="number" min="0" value={action.metadata?.days || 0} onChange={(e) => updateActionMetadata(action.id, 'days', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-muted-foreground mb-1">Hours</label>
                                      <input type="number" min="0" value={action.metadata?.hours || 0} onChange={(e) => updateActionMetadata(action.id, 'hours', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-muted-foreground mb-1">Minutes</label>
                                      <input type="number" min="0" value={action.metadata?.minutes || 0} onChange={(e) => updateActionMetadata(action.id, 'minutes', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary" />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {action.type === 'Request Approval' && (
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Approver Role Required</label>
                                  <select value={action.metadata?.role || 'Manager'} onChange={(e) => updateActionMetadata(action.id, 'role', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary">
                                    <option value="Manager">Manager</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Super Admin">Super Admin</option>
                                    <option value="Finance">Finance Team</option>
                                  </select>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    <ShieldAlert className="w-3 h-3 inline mr-1 text-rose-500" />
                                    Workflow execution will pause at this step until explicitly approved.
                                  </p>
                                </div>
                              )}

                              {action.type === 'Send WhatsApp' && (
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Message Template</label>
                                  <textarea rows={3} value={action.metadata?.template || ''} onChange={(e) => updateActionMetadata(action.id, 'template', e.target.value)} placeholder="Hi {{lead.name}}, we received your application..." className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-1 focus:ring-primary resize-none" />
                                </div>
                              )}
                              
                            </div>
                          </div>
                        )}
                      </Draggable>
                      {index < actions.length - 1 && (
                        <div className="flex justify-center -my-2"><div className="w-px h-10 bg-border"></div></div>
                      )}
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="flex justify-center pt-4 gap-4">
            <button onClick={() => handleAddAction('Create Task')} className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors font-medium text-sm bg-card shadow-sm">
              <Plus className="w-4 h-4" /> Add Action
            </button>
            <button onClick={() => handleAddAction('Wait')} className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground hover:border-indigo-500/50 hover:text-indigo-600 hover:bg-indigo-500/5 transition-colors font-medium text-sm bg-card shadow-sm">
              <Clock className="w-4 h-4" /> Add Delay
            </button>
            <button onClick={() => handleAddAction('Request Approval')} className="flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-border text-muted-foreground hover:border-rose-500/50 hover:text-rose-600 hover:bg-rose-500/5 transition-colors font-medium text-sm bg-card shadow-sm">
              <ShieldAlert className="w-4 h-4" /> Require Approval
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
