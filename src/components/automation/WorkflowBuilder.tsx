import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ArrowRight, Zap, Settings, Activity, Plus, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Workflow, TriggerType, ActionType } from '../../types/automation';
import { automationService } from '../../lib/automationService';
import { cn } from '../../lib/utils';

interface WorkflowBuilderProps {
  onBack: () => void;
}

export function WorkflowBuilder({ onBack }: WorkflowBuilderProps) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('Lead Created');
  const [actions, setActions] = useState<{ id: string, type: ActionType }[]>([
    { id: 'action_1', type: 'Create Task' }
  ]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(actions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActions(items);
  };

  const handleAddAction = () => {
    setActions([...actions, { id: `action_${Date.now()}`, type: 'Send Email' }]);
  };

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please provide a workflow name');
      return;
    }

    const newWorkflow: Workflow = {
      id: `wf_${Date.now()}`,
      name,
      description: 'Custom user workflow',
      status: 'active',
      trigger,
      conditions: [], // Skipping complex condition builder for this demo to save space
      actions: actions.map(a => ({ id: a.id, type: a.type, metadata: {} }))
    };

    automationService.saveWorkflow(newWorkflow);
    toast.success('Workflow saved and enabled successfully');
    onBack();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Create Workflow</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define triggers, conditions, and actions.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm">Save & Enable</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-12">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <label className="block text-sm font-medium mb-1.5">Workflow Name</label>
            <input 
              value={name} onChange={(e) => setName(e.target.value)}
              type="text" placeholder="e.g., Immediate Welcome Sequence" 
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
            />
          </div>

          <div className="bg-card border-2 border-primary/20 rounded-xl p-5 shadow-sm relative">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full border border-primary/20 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Trigger
            </div>
            <div className="mt-2 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">When this happens...</label>
                <select 
                  value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="Lead Created">Lead Created</option>
                  <option value="Lead Updated">Lead Updated</option>
                  <option value="Lead Status Changed">Lead Status Changed</option>
                  <option value="Lead Score Changed">Lead Score Changed</option>
                  <option value="Payment Received">Payment Received</option>
                  <option value="Admission Stage Changed">Admission Stage Changed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-2"><div className="w-px h-8 bg-border"></div></div>

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
                              snapshot.isDragging ? "border-primary shadow-md scale-105 z-50" : "border-border"
                            )}
                          >
                            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5">
                              <Activity className="w-3 h-3" /> Action {index + 1}
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
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Do this...</label>
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
                                  <option value="Send Email">Send Email</option>
                                  <option value="Assign Counselor">Assign Counselor</option>
                                  <option value="Create Task">Create Task</option>
                                  <option value="Update Lead Score">Update Lead Score</option>
                                  <option value="Send Notification">Send Notification</option>
                                </select>
                              </div>
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

          <div className="flex justify-center pt-4">
            <button onClick={handleAddAction} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors font-medium text-sm">
              <Plus className="w-4 h-4" /> Add Action
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
