import { useMemo } from 'react';
import { Task } from '../../../types/task';
import { Calendar, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { isToday, isPast, parseISO, startOfDay, isThisWeek } from 'date-fns';
import { cn } from '../../../lib/utils';

export type TaskDashboardPreset = 'all' | 'due_today' | 'overdue' | 'completed_today' | 'upcoming_week' | 'high_priority';

interface TasksDashboardProps {
  tasks: Task[];
  activePreset?: TaskDashboardPreset;
  onSelectPreset?: (preset: TaskDashboardPreset) => void;
}

export function TasksDashboard({ tasks, activePreset = 'all', onSelectPreset }: TasksDashboardProps) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    
    let dueToday = 0;
    let overdue = 0;
    let completedToday = 0;
    let upcomingThisWeek = 0;
    let highPriority = 0;

    tasks.forEach(task => {
      if (!task.dueDate) return;
      const dueDate = parseISO(task.dueDate);
      const isCompleted = task.status === 'Completed';

      if (isCompleted) {
        if (isToday(dueDate)) completedToday++;
      } else {
        if (isToday(dueDate)) dueToday++;
        if (isPast(dueDate) && !isToday(dueDate)) overdue++;
        if (isThisWeek(dueDate) && !isToday(dueDate) && !isPast(dueDate)) upcomingThisWeek++;
        if (task.priority === 'High' || task.priority === 'Urgent') highPriority++;
      }
    });

    return { dueToday, overdue, completedToday, upcomingThisWeek, highPriority };
  }, [tasks]);

  const cards: {
    preset: TaskDashboardPreset;
    label: string;
    value: number;
    icon: typeof Calendar;
    color: string;
    bg: string;
  }[] = [
    { preset: 'due_today', label: 'Due Today', value: stats.dueToday, icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { preset: 'overdue', label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    { preset: 'completed_today', label: 'Completed Today', value: stats.completedToday, icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    { preset: 'upcoming_week', label: 'Upcoming This Week', value: stats.upcomingThisWeek, icon: Clock, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { preset: 'high_priority', label: 'High Priority', value: stats.highPriority, icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isActive = activePreset === card.preset;
        const isFifthOnMobile = idx === 4;
        return (
          <button
            key={card.preset}
            type="button"
            onClick={() => {
              if (onSelectPreset) {
                onSelectPreset(isActive ? 'all' : card.preset);
              }
            }}
            className={cn(
              "w-full bg-card border rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between text-left transition-all duration-200 group relative touch-manipulation",
              isFifthOnMobile ? "col-span-2 sm:col-span-1" : "col-span-1",
              isActive 
                ? "border-primary ring-2 ring-primary/30 bg-primary/[0.03] shadow-md -translate-y-0.5" 
                : "border-border hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            )}
          >
            <div className="flex justify-between items-start mb-1.5 sm:mb-2 w-full">
              <span className={cn(
                "text-xs sm:text-sm font-medium transition-colors truncate pr-1",
                isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {card.label}
              </span>
              <div className={cn("p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-110", card.bg, card.color)}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between w-full">
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{card.value}</div>
              {isActive && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
