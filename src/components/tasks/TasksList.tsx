import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, TaskType } from '../../types/task';
import { LeadStatus } from '../../types/schema';
import { cn } from '../../lib/utils';
import { 
  Search, Plus, Calendar as CalendarIcon, CheckCircle2, 
  Circle, Clock, Phone, MessageCircle, Mail, Video, Bell, 
  MoreHorizontal, Filter, AlertCircle, LayoutList, List
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { format, isPast, isToday } from 'date-fns';
import { TasksDashboard } from './components/TasksDashboard';
import { TasksCalendar } from './components/TasksCalendar';
import { TaskFormDialog } from './components/TaskFormDialog';
import { TaskFollowUpDialog } from './components/TaskFollowUpDialog';
import { MobileTaskCard } from './mobile/MobileTaskCard';
import { toast } from 'sonner';

import { useTasks } from '../../hooks/useTasks';

export function TasksList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const { tasks, isLoading, addTask, updateTask, refresh } = useTasks({
    status: statusFilter === 'All' ? undefined : statusFilter,
    searchTerm: searchTerm || undefined
  });

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [followUpTask, setFollowUpTask] = useState<Task | undefined>();

  const filteredTasks = tasks; // Data is already filtered by useTasks hook

  const handleCreateOrEditTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
      toast.success('Task updated successfully');
    } else {
      await addTask(taskData);
      toast.success('Task created successfully');
    }
    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  const handleCompleteTask = async (data: { notes: string, newLeadStatus?: LeadStatus, scheduleNext: boolean, nextTaskDate?: string, nextTaskTime?: string }) => {
    if (!followUpTask) return;
    
    // Complete current task
    await updateTask(followUpTask.id, { status: 'Completed', description: data.notes });

    // Handle automation / follow up task
    if (data.scheduleNext && data.nextTaskDate) {
      await addTask({
        title: `Follow up: ${followUpTask.title}`,
        type: followUpTask.type,
        priority: followUpTask.priority,
        dueDate: data.nextTaskDate,
        dueTime: data.nextTaskTime,
        status: 'Pending',
        assignedUser: followUpTask.assignedUser,
        leadId: followUpTask.leadId
      });
      toast.success('Task completed and follow-up scheduled');
    } else {
      toast.success('Task completed');
    }

    if (data.newLeadStatus) {
      toast.info(`Lead status updated to ${data.newLeadStatus}`);
      
      // Automations based on status change
      if (data.newLeadStatus === 'Admission Done' && followUpTask.leadId) {
        // Find pending tasks for this lead
        const pendingTasks = tasks.filter(t => t.leadId === followUpTask.leadId && t.status === 'Pending');
        for (const pt of pendingTasks) {
          await updateTask(pt.id, { status: 'Cancelled' });
        }
        toast.info('Auto-cancelled pending tasks for admitted lead');
      } else if (data.newLeadStatus === 'Interested' && followUpTask.leadId) {
        // Create follow-up in 2 days
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 2);
        await addTask({
          title: 'Follow up (Interested Lead)',
          type: 'Call',
          priority: 'High',
          dueDate: nextDate.toISOString().split('T')[0],
          status: 'Pending',
          assignedUser: followUpTask.assignedUser,
          leadId: followUpTask.leadId
        });
        toast.info('Auto-scheduled follow-up in 2 days for Interested lead');
      } else if (data.newLeadStatus === 'Documents Pending' && followUpTask.leadId) {
        // Reminder in 3 days
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 3);
        await addTask({
          title: 'Document Collection Reminder',
          type: 'Document Collection',
          priority: 'High',
          dueDate: nextDate.toISOString().split('T')[0],
          status: 'Pending',
          assignedUser: followUpTask.assignedUser,
          leadId: followUpTask.leadId
        });
        toast.info('Auto-scheduled document reminder in 3 days');
      }
    }

    setFollowUpTask(undefined);
  };

  const toggleTaskStatus = async (task: Task) => {
    if (task.status === 'Completed') {
      // Reopen task
      await updateTask(task.id, { status: 'Pending' });
      toast.success('Task reopened');
    } else {
      // Open Follow up dialog to complete
      setFollowUpTask(task);
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'High': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Medium': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'Low': return <AlertCircle className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'Call': return <Phone className="w-4 h-4" />;
      case 'WhatsApp': return <MessageCircle className="w-4 h-4" />;
      case 'Email': return <Mail className="w-4 h-4" />;
      case 'Meeting': return <Video className="w-4 h-4" />;
      case 'Reminder': return <Bell className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 p-4 sm:p-8">
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks & Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Manage your daily activities and follow-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-card border border-border rounded-lg p-1">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                viewMode === 'list' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                viewMode === 'calendar' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarIcon className="w-4 h-4" /> Calendar
            </button>
          </div>
          <button 
            onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      <TasksDashboard tasks={tasks} />

      {/* Main Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-[500px]">
        {/* Toolbar */}
        {viewMode === 'list' && (
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search tasks or leads..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar shrink-0">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
                {(['All', 'Pending', 'In Progress', 'Completed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                      statusFilter === status 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                <Filter className="w-4 h-4" /> Filters
              </button>
            </div>
          </div>
        )}

        {/* Task List or Calendar */}
        {viewMode === 'calendar' ? (
           <TasksCalendar tasks={tasks} />
        ) : (
          <div className="overflow-x-auto flex-1">
            {filteredTasks.length === 0 ? (
              <EmptyState 
                icon={LayoutList}
                title="No tasks found" 
                description="Try adjusting your search or filters to find what you're looking for."
              />
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden p-4 bg-muted/5">
                  {filteredTasks.map((task) => (
                    <MobileTaskCard 
                      key={task.id} 
                      task={task} 
                      onToggleStatus={toggleTaskStatus}
                      onClick={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                    />
                  ))}
                </div>

                {/* Desktop View */}
                <table className="hidden md:table w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold w-12"></th>
                    <th className="px-6 py-4 font-semibold">Task</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Related Lead</th>
                    <th className="px-6 py-4 font-semibold">Assigned To</th>
                    <th className="px-6 py-4 font-semibold">Priority</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      className={cn(
                        "hover:bg-muted/30 transition-colors group cursor-pointer",
                        task.status === 'Completed' && "opacity-60 bg-muted/10"
                      )}
                      onClick={(e) => {
                        // Prevent opening edit dialog if clicking on checkbox or actions
                        const target = e.target as HTMLElement;
                        if (!target.closest('button')) {
                          setEditingTask(task);
                          setIsFormOpen(true);
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border transition-all",
                            task.status === 'Completed' 
                              ? "bg-green-500 border-green-500 text-white" 
                              : "border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/50"
                          )}
                        >
                          {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getTypeIcon(task.type)}
                          <span>{task.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {task.leadName ? (
                          task.leadId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/all-leads/${task.leadId}`);
                              }}
                              className="font-medium text-primary hover:underline"
                            >
                              {task.leadName}
                            </button>
                          ) : (
                            <span className="font-medium text-foreground">{task.leadName}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(task.priority)}
                          <span className={cn(
                            "font-medium",
                            task.priority === 'Urgent' ? "text-red-600" :
                            task.priority === 'High' ? "text-orange-600" :
                            task.priority === 'Medium' ? "text-amber-600" :
                            "text-green-600"
                          )}>{task.priority}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-medium",
                            isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'Completed' ? "text-red-600" : "text-foreground"
                          )}>
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                          {task.dueTime && (
                             <span className="text-xs text-muted-foreground mt-0.5">{task.dueTime}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        )}
      </div>

      <TaskFormDialog 
        task={editingTask} 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingTask(undefined); }} 
        onSave={handleCreateOrEditTask} 
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
