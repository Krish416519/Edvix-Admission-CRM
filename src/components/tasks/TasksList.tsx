import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, TaskType } from '../../types/task';
import { LeadStatus } from '../../types/schema';
import { cn } from '../../lib/utils';
import { 
  Search, Plus, Calendar as CalendarIcon, CheckCircle2, 
  Circle, Clock, Phone, MessageCircle, Mail, Video, Bell, 
  MoreHorizontal, Filter, AlertCircle, LayoutList, List, X,
  RotateCcw
} from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { format, isPast, isToday, parseISO, isTomorrow, isThisWeek, addDays, startOfDay } from 'date-fns';
import { TasksDashboard, TaskDashboardPreset } from './components/TasksDashboard';
import { TasksCalendar } from './components/TasksCalendar';
import { TaskFormDialog } from './components/TaskFormDialog';
import { TaskFollowUpDialog } from './components/TaskFollowUpDialog';
import { TaskFilterDrawer, TaskFilterState, INITIAL_TASK_FILTERS } from './components/TaskFilterDrawer';
import { MobileTaskCard } from './mobile/MobileTaskCard';
import { toast } from 'sonner';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../contexts/AuthContext';

export function TasksList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');
  
  // Search and view state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Advanced Filters State
  const [filters, setFilters] = useState<TaskFilterState>(INITIAL_TASK_FILTERS);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [activeDashboardPreset, setActiveDashboardPreset] = useState<TaskDashboardPreset>('all');

  // Fetch all tasks for current user/organization
  const { tasks, isLoading, addTask, updateTask, refresh } = useTasks({
    pageSize: 200,
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(25);

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [followUpTask, setFollowUpTask] = useState<Task | undefined>();

  // Multi-dimensional filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Search filter across title, number, description, lead, and assignee
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(term);
        const matchesNum = task.taskNumber?.toLowerCase().includes(term);
        const matchesDesc = task.description?.toLowerCase().includes(term);
        const matchesLead = task.leadName?.toLowerCase().includes(term);
        const assignedName = typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name;
        const matchesAssigned = assignedName?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesNum && !matchesDesc && !matchesLead && !matchesAssigned) {
          return false;
        }
      }

      // 2. Toolbar quick status filter
      if (statusFilter !== 'All' && task.status !== statusFilter) {
        return false;
      }

      // 3. Drawer Status filter
      if (filters.status !== 'All' && task.status !== filters.status) {
        return false;
      }

      // 4. Priority filter
      if (filters.priority !== 'All' && task.priority !== filters.priority) {
        return false;
      }

      // 5. Task Type filter
      if (filters.type !== 'All' && task.type !== filters.type) {
        return false;
      }

      // 6. Assigned Counselor / User
      if (filters.assignedUser === 'me') {
        const isAssigned = user && (task.assignedUser === user.id || (task as any).assignedToId === user.id);
        if (!isAssigned) return false;
      } else if (filters.assignedUser !== 'All') {
        const isAssigned = task.assignedUser === filters.assignedUser || (task as any).assignedToId === filters.assignedUser;
        if (!isAssigned) return false;
      }

      // 7. Lead Association
      if (filters.leadFilter === 'with_lead' && !task.leadId && !task.leadName) {
        return false;
      }
      if (filters.leadFilter === 'without_lead' && (task.leadId || task.leadName)) {
        return false;
      }

      // 8. Due Date Preset / Range
      if (task.dueDate) {
        try {
          const dueDate = parseISO(task.dueDate);
          const isFinished = task.status === 'Completed' || task.status === 'Cancelled';

          if (filters.datePreset === 'overdue') {
            if (!isPast(dueDate) || isToday(dueDate) || isFinished) return false;
          } else if (filters.datePreset === 'today') {
            if (!isToday(dueDate)) return false;
          } else if (filters.datePreset === 'tomorrow') {
            if (!isTomorrow(dueDate)) return false;
          } else if (filters.datePreset === 'this_week') {
            if (!isThisWeek(dueDate)) return false;
          } else if (filters.datePreset === 'next_7_days') {
            const now = startOfDay(new Date());
            const in7Days = addDays(now, 7);
            if (dueDate < now || dueDate > in7Days) return false;
          } else if (filters.datePreset === 'custom') {
            const taskDay = task.dueDate.split('T')[0];
            if (filters.customStartDate && taskDay < filters.customStartDate) return false;
            if (filters.customEndDate && taskDay > filters.customEndDate) return false;
          }
        } catch {
          // ignore invalid date formats
        }
      } else if (filters.datePreset !== 'all') {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (filters.sortBy === 'due_asc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '') || (a.dueTime || '').localeCompare(b.dueTime || '');
      } else if (filters.sortBy === 'due_desc') {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      } else if (filters.sortBy === 'priority_desc') {
        const score = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (score[b.priority] || 0) - (score[a.priority] || 0);
      } else if (filters.sortBy === 'created_desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return 0;
    });
  }, [tasks, searchTerm, statusFilter, filters, user]);

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filters]);

  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  
  const paginatedTasks = useMemo(() => {
    if (pageSize === 'All') return filteredTasks;
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Active filter count in drawer
  const activeDrawerFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'All') count++;
    if (filters.priority !== 'All') count++;
    if (filters.type !== 'All') count++;
    if (filters.datePreset !== 'all') count++;
    if (filters.assignedUser !== 'All') count++;
    if (filters.leadFilter !== 'all') count++;
    if (filters.sortBy !== 'due_asc') count++;
    return count;
  }, [filters]);

  // Overall check if any filter or search is applied
  const hasAnyFilterActive = activeDrawerFilterCount > 0 || statusFilter !== 'All' || searchTerm.trim() !== '' || activeDashboardPreset !== 'all';

  // Handle clicking dashboard KPI cards
  const handleSelectDashboardPreset = (preset: TaskDashboardPreset) => {
    setActiveDashboardPreset(preset);
    if (preset === 'all') {
      setFilters(prev => ({ ...prev, datePreset: 'all', priority: 'All', status: 'All' }));
      setStatusFilter('All');
    } else if (preset === 'due_today') {
      setFilters(prev => ({ ...prev, datePreset: 'today', status: 'All' }));
      setStatusFilter('All');
    } else if (preset === 'overdue') {
      setFilters(prev => ({ ...prev, datePreset: 'overdue', status: 'All' }));
      setStatusFilter('All');
    } else if (preset === 'completed_today') {
      setFilters(prev => ({ ...prev, datePreset: 'today', status: 'Completed' }));
      setStatusFilter('Completed');
    } else if (preset === 'upcoming_week') {
      setFilters(prev => ({ ...prev, datePreset: 'this_week', status: 'All' }));
      setStatusFilter('All');
    } else if (preset === 'high_priority') {
      setFilters(prev => ({ ...prev, priority: 'High', datePreset: 'all' }));
      setStatusFilter('All');
    }
  };

  const handleResetAllFilters = () => {
    setFilters(INITIAL_TASK_FILTERS);
    setStatusFilter('All');
    setSearchTerm('');
    setActiveDashboardPreset('all');
  };

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
      if (data.newLeadStatus === 'Admitted' && followUpTask.leadId) {
        const pendingTasks = tasks.filter(t => t.leadId === followUpTask.leadId && t.status === 'Pending');
        for (const pt of pendingTasks) {
          await updateTask(pt.id, { status: 'Cancelled' });
        }
        toast.info('Auto-cancelled pending tasks for admitted lead');
      } else if (data.newLeadStatus === 'Hot' && followUpTask.leadId) {
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
        toast.info('Auto-scheduled follow-up in 2 days for Hot lead');
      } else if (data.newLeadStatus === 'Docs Pending' && followUpTask.leadId) {
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
      await updateTask(task.id, { status: 'Pending' });
      toast.success('Task reopened');
    } else {
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

  // Auto-scroll to task when arriving via notification click
  useEffect(() => {
    if (taskIdParam && tasks.length > 0 && !isLoading) {
      setTimeout(() => {
        const taskEl = document.getElementById(`task-${taskIdParam}`);
        if (taskEl) {
          taskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskEl.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => taskEl.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 3000);
        }
      }, 300);
    }
  }, [taskIdParam, tasks, isLoading]);

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
          <p className="text-muted-foreground mt-1">Manage your daily activities, follow-ups, and commitments.</p>
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
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm font-semibold text-xs sm:text-sm shrink-0 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI Dashboard */}
      <TasksDashboard 
        tasks={tasks} 
        activePreset={activeDashboardPreset}
        onSelectPreset={handleSelectDashboardPreset}
      />

      {/* Main Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-[500px]">
        {/* Toolbar */}
        {viewMode === 'list' && (
          <div className="flex flex-col border-b border-border bg-muted/10">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="relative max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search tasks, number, lead..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                {/* Status Quick Pills */}
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 overflow-x-auto hide-scrollbar">
                  {(['All', 'Pending', 'In Progress', 'Completed'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        if (status !== 'All' && filters.status !== 'All') {
                          setFilters(f => ({ ...f, status: 'All' }));
                        }
                      }}
                      className={cn(
                        "px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap touch-manipulation",
                        statusFilter === status 
                          ? "bg-primary/10 text-primary font-semibold" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                
                {/* Filters Drawer Trigger Button */}
                <button 
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-xs border shrink-0 touch-manipulation",
                    activeDrawerFilterCount > 0 
                      ? "bg-primary/10 border-primary/40 text-primary font-semibold hover:bg-primary/15" 
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                  title="Open filter options"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {activeDrawerFilterCount > 0 && (
                    <span className="w-5 h-5 flex items-center justify-center text-[11px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                      {activeDrawerFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Badges / Chips Row */}
            {hasAnyFilterActive && (
              <div className="px-4 py-2 bg-muted/20 border-t border-border flex items-center gap-2 flex-wrap text-xs animate-in fade-in duration-200">
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  Active Filters:
                </span>

                {filters.datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Due: <strong className="text-primary">{filters.datePreset === 'overdue' ? 'Overdue' : filters.datePreset === 'today' ? 'Today' : filters.datePreset === 'tomorrow' ? 'Tomorrow' : filters.datePreset === 'this_week' ? 'This Week' : filters.datePreset === 'next_7_days' ? 'Next 7 Days' : 'Custom'}</strong>
                    <button 
                      type="button"
                      onClick={() => { setFilters(f => ({ ...f, datePreset: 'all' })); setActiveDashboardPreset('all'); }} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.priority !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Priority: <strong className="text-primary">{filters.priority}</strong>
                    <button 
                      type="button"
                      onClick={() => { setFilters(f => ({ ...f, priority: 'All' })); if (activeDashboardPreset === 'high_priority') setActiveDashboardPreset('all'); }} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.type !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Type: <strong className="text-primary">{filters.type}</strong>
                    <button 
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, type: 'All' }))} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {statusFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Status: <strong className="text-primary">{statusFilter}</strong>
                    <button 
                      type="button"
                      onClick={() => { setStatusFilter('All'); if (activeDashboardPreset === 'completed_today') setActiveDashboardPreset('all'); }} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.status !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Status: <strong className="text-primary">{filters.status}</strong>
                    <button 
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, status: 'All' }))} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.assignedUser !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Counselor: <strong className="text-primary">{filters.assignedUser === 'me' ? 'My Tasks' : 'Selected'}</strong>
                    <button 
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, assignedUser: 'All' }))} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.leadFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Lead: <strong className="text-primary">{filters.leadFilter === 'with_lead' ? 'Has Lead' : 'No Lead'}</strong>
                    <button 
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, leadFilter: 'all' }))} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchTerm.trim() !== '' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-background border border-border text-foreground font-medium shadow-xs">
                    Keyword: "<strong className="text-primary">{searchTerm}</strong>"
                    <button 
                      type="button"
                      onClick={() => setSearchTerm('')} 
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-muted-foreground">
                    Showing <strong className="text-foreground">{filteredTasks.length}</strong> of {tasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Task List or Calendar */}
        {viewMode === 'calendar' ? (
           <TasksCalendar tasks={filteredTasks} />
        ) : (
          <div className="overflow-x-auto flex-1">
            {filteredTasks.length === 0 ? (
              <EmptyState 
                icon={LayoutList}
                title="No tasks found" 
                description="Try adjusting your search or filters to find what you're looking for."
                action={hasAnyFilterActive ? (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Clear All Filters
                  </button>
                ) : undefined}
              />
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden p-4 bg-muted/5 divide-y divide-border">
                  {paginatedTasks.map((task) => (
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
                  {paginatedTasks.map((task) => (
                     <tr 
                       key={task.id} 
                       id={`task-${task.id}`}
                       className={cn(
                        "hover:bg-muted/30 transition-colors group cursor-pointer",
                        task.status === 'Completed' && "opacity-60 bg-muted/10"
                      )}
                      onClick={(e) => {
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
                          {(() => {
                            const isTaskOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)) && task.status !== 'Completed';
                            return (
                              <span className={cn(
                                "font-medium",
                                isTaskOverdue ? "text-red-600" : "text-foreground"
                              )}>
                                {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No date'}
                              </span>
                            );
                          })()}
                          {task.dueTime && (
                             <span className="text-xs text-muted-foreground mt-0.5">{task.dueTime}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setIsFormOpen(true);
                          }}
                          className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    Showing <strong className="text-foreground">{filteredTasks.length === 0 ? 0 : (currentPage - 1) * (pageSize === 'All' ? filteredTasks.length : pageSize) + 1}</strong> to{' '}
                    <strong className="text-foreground">
                      {pageSize === 'All' ? filteredTasks.length : Math.min(currentPage * pageSize, filteredTasks.length)}
                    </strong>{' '}
                    of <strong className="text-foreground">{filteredTasks.length}</strong> tasks
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPageSize(val === 'All' ? 'All' : Number(val));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-background border border-border rounded text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="All">All</option>
                    </select>
                  </div>
                </div>

                {pageSize !== 'All' && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-muted-foreground font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task Filter Drawer */}
      <TaskFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={handleResetAllFilters}
        tasksCount={filteredTasks.length}
      />

      {/* Create / Edit Task Dialog */}
      <TaskFormDialog 
        task={editingTask} 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingTask(undefined); }} 
        onSave={handleCreateOrEditTask} 
      />

      {/* Follow-up / Complete Dialog */}
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
