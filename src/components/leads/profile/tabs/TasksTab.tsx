import { useState, useEffect } from 'react';
import { Lead } from '../../../../types/schema';
import { Task } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';
import { format, isPast, isToday } from 'date-fns';
import { CheckCircle2, Circle, Clock, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { TaskFormDialog } from '../../../tasks/components/TaskFormDialog';
import { TaskFollowUpDialog } from '../../../tasks/components/TaskFollowUpDialog';
import { addAuditLog } from '../../../../data/mockAuditLogs';
import { toast } from 'sonner';

export function TasksTab({ lead, refreshKey = 0 }: { lead: Lead, refreshKey?: number }) {
  const { tasks, isLoading, addTask, updateTask, refresh } = useTasks({ leadId: lead.id, pageSize: 100 });
  
  useEffect(() => {
    refresh();
  }, [refreshKey, refresh]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [followUpTask, setFollowUpTask] = useState<Task | undefined>();

  const toggleTaskStatus = async (task: Task) => {
    if (task.status === 'Completed') {
      await updateTask(task.id, { status: 'Pending' });
      toast.success('Task reopened');
      addAuditLog({
        action: 'Updated',
        entityType: 'Task',
        entityId: task.id,
        title: 'Task Reopened',
        description: `Task "${task.title}" was reopened.`,
        userName: 'Current User',
        leadId: lead.id
      });
    } else {
      setFollowUpTask(task);
    }
  };

  const handleCompleteTask = async (data: any) => {
    if (!followUpTask) return;
    
    await updateTask(followUpTask.id, { status: 'Completed', description: data.notes });
    setFollowUpTask(undefined);
    toast.success('Task completed');
    addAuditLog({
      action: 'Completed',
      entityType: 'Task',
      entityId: followUpTask.id,
      title: 'Task Completed',
      description: `Task "${followUpTask.title}" was completed.\nNotes: ${data.notes}`,
      userName: 'Current User',
      leadId: lead.id
    });
  };

  return (
    <div className="p-6 animate-in fade-in duration-300 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">Tasks & Follow-ups</h3>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {tasks.length === 0 && !isLoading ? (
          <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
            No tasks scheduled for this lead.
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={cn(
                "bg-card border border-border rounded-xl p-4 shadow-sm flex items-start gap-4 transition-colors",
                task.status === 'Completed' && "opacity-60 bg-muted/10"
              )}
            >
              <button 
                onClick={() => toggleTaskStatus(task)}
                className={cn(
                  "w-6 h-6 shrink-0 rounded-full flex items-center justify-center border transition-all mt-0.5",
                  task.status === 'Completed' 
                    ? "bg-green-500 border-green-500 text-white" 
                    : "border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/50"
                )}
              >
                {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-foreground truncate">{task.title}</h4>
                  <span className={cn(
                    "text-xs font-medium shrink-0",
                    isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'Completed' ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.type}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-medium",
                    task.priority === 'Urgent' ? "bg-red-100 text-red-700" :
                    task.priority === 'High' ? "bg-orange-100 text-orange-700" :
                    task.priority === 'Medium' ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  )}>
                    {task.priority}
                  </span>
                </div>
                
                {task.notes && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.notes}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <TaskFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          const res = await addTask({ ...data, leadId: lead.id, status: 'Pending' });
          setIsFormOpen(false);
          if (res.success && res.data) {
            addAuditLog({
              action: 'Created',
              entityType: 'Task',
              entityId: res.data.id,
              title: 'Task Created',
              description: `Task "${res.data.title}" was created.`,
              userName: 'Current User',
              leadId: lead.id
            });
          }
        }}
      />

      {followUpTask && (
        <TaskFollowUpDialog 
          task={followUpTask}
          isOpen={true}
          onClose={() => setFollowUpTask(undefined)}
          onComplete={handleCompleteTask}
        />
      )}
    </div>
  );
}
