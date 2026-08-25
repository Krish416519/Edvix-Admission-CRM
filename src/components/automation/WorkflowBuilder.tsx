import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ArrowRight, Zap, Settings, Activity, Plus, GripVertical, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Workflow, TriggerType, ActionType, ConditionNode, ConditionOperator, LogicType } from '../../types/automation';
import { automationService } from '../../lib/automationService';
import { cn } from '../../lib/utils';

interface WorkflowBuilderProps {
  onBack: () => void;
}

export function WorkflowBuilder({ onBack }: WorkflowBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('Lead Created');
  
  // V2 Condition Tree
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

  // Condition Builder Helpers
  const addCondition = (parentId: string) => {
    const newCond: ConditionNode = { id: `cond_${Date.now()}`, type: 'condition', field: 'status', operator: 'equals', value: '' };
    
    // Simple top-level append for now (can be recursive in full implementation)
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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please provide a workflow name');
      return;
    }

    const newWorkflow: Workflow = {
      id: `wf_${Date.now()}`,
      name,
      description,
      status: 'active',
      trigger,
      conditions_tree: conditionsTree,
      actions: actions,
      max_execution_depth: 5 // Default loop protection
    };

    try {
      await automationService.saveWorkflow(newWorkflow);
      toast.success('Workflow saved successfully');
      onBack();
    } catch (error) {
       console.error("Failed to save workflow", error);
       toast.error('Failed to save workflow');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Workflow Builder 2.0</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Design automated sequences with conditions and delays.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm">Save & Enable</button>
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
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description (Optional)</label>
              <input 
                value={description} onChange={(e) => setDescription(e.target.value)}
                type="text" placeholder="What does this automation do?" 
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          {/* TRIGGER NODE */}
          <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full border border-primary/20 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Trigger
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1.5 text-foreground">When this event occurs...</label>
              <select 
                value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="Lead Created">Lead Created</option>
                <option value="Lead Updated">Lead Updated</option>
                <option value="Lead Status Changed">Lead Status Changed</option>
                <option value="Payment Received">Payment Received</option>
                <option value="Admission Stage Changed">Admission Stage Changed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-2"><div className="w-px h-8 bg-border"></div></div>

          {/* CONDITION NODE */}
          <div className="bg-card border border-amber-500/30 rounded-xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-200 dark:border-amber-500/30 flex items-center gap-1.5">
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
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed border-border text-center">
                  Always run (No conditions set)
                </div>
              ) : (
                <div className="space-y-3">
                  {conditionsTree.conditions?.map((c) => (
                    <div key={c.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-background p-2 rounded-lg border border-border">
                      <select 
                        value={c.field} onChange={(e) => updateCondition(c.id, { field: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                      >
                        <option value="new_data.status">Status</option>
                        <option value="new_data.source">Source</option>
                        <option value="new_data.course">Course</option>
                        <option value="new_data.priority">Priority</option>
                      </select>
                      <select 
                        value={c.operator} onChange={(e) => updateCondition(c.id, { operator: e.target.value as ConditionOperator })}
                        className="w-32 px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="exists">Exists</option>
                      </select>
                      {c.operator !== 'exists' && c.operator !== 'not_exists' && (
                        <input 
                          type="text" value={c.value || ''} onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                        />
                      )}
                      <button onClick={() => removeCondition(c.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md">
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
                              "bg-card border rounded-xl p-5 shadow-sm relative group transition-all",
                              snapshot.isDragging ? "border-primary shadow-md scale-105 z-50" : "border-border",
                              action.type === 'Delay Action' ? "border-indigo-500/30" : ""
                            )}
                          >
                            <div className={cn(
                              "absolute -top-3 left-4 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border flex items-center gap-1.5",
                              action.type === 'Delay Action' 
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                            )}>
                              {action.type === 'Delay Action' ? <Clock className="w-3 h-3" /> : <Activity className="w-3 h-3" />} 
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
                                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                                >
                                  <option value="Send WhatsApp">Send WhatsApp Message</option>
                                  <option value="Create Task">Create Task</option>
                                  <option value="Send Notification">Send Notification</option>
                                  <option value="Update Lead Status">Update Lead Status</option>
                                  <option value="Delay Action">Pause / Wait</option>
                                  <option value="Webhook">Trigger Webhook</option>
                                </select>
                              </div>

                              {/* Dynamic Action Configuration */}
                              {action.type === 'Delay Action' && (
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Days</label>
                                    <input type="number" min="0" value={action.metadata?.days || 0} onChange={(e) => updateActionMetadata(action.id, 'days', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Hours</label>
                                    <input type="number" min="0" value={action.metadata?.hours || 0} onChange={(e) => updateActionMetadata(action.id, 'hours', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Minutes</label>
                                    <input type="number" min="0" value={action.metadata?.minutes || 0} onChange={(e) => updateActionMetadata(action.id, 'minutes', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                  </div>
                                </div>
                              )}

                              {action.type === 'Create Task' && (
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Task Title</label>
                                  <input type="text" value={action.metadata?.title || ''} onChange={(e) => updateActionMetadata(action.id, 'title', e.target.value)} placeholder="e.g., Follow up immediately" className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                </div>
                              )}

                              {action.type === 'Send Notification' && (
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">Notification Message</label>
                                  <input type="text" value={action.metadata?.message || ''} onChange={(e) => updateActionMetadata(action.id, 'message', e.target.value)} placeholder="e.g., A hot lead needs your attention!" className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                </div>
                              )}

                              {action.type === 'Update Lead Status' && (
                                <div>
                                  <label className="block text-xs text-muted-foreground mb-1">New Status</label>
                                  <select value={action.metadata?.status || 'Qualified'} onChange={(e) => updateActionMetadata(action.id, 'status', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background">
                                    <option value="New">New</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Application Started">Application Started</option>
                                  </select>
                                </div>
                              )}

                              {action.type === 'Webhook' && (
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Endpoint URL</label>
                                    <input type="url" value={action.metadata?.url || ''} onChange={(e) => updateActionMetadata(action.id, 'url', e.target.value)} placeholder="https://api.example.com/webhook" className="w-full px-3 py-1.5 text-sm border rounded-lg bg-background" />
                                  </div>
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
            <button onClick={() => handleAddAction('Create Task')} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors font-medium text-sm bg-background">
              <Plus className="w-4 h-4" /> Add Action
            </button>
            <button onClick={() => handleAddAction('Delay Action')} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-border text-muted-foreground hover:border-indigo-500/50 hover:text-indigo-600 transition-colors font-medium text-sm bg-background">
              <Clock className="w-4 h-4" /> Add Delay
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
