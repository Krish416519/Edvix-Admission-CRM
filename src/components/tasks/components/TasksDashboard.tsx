import { useMemo } from 'react';
import { Task } from '../../../types/task';
import { Calendar, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { isToday, isPast, parseISO, startOfDay, isThisWeek } from 'date-fns';
import { cn } from '../../../lib/utils';

export function TasksDashboard({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    
    let dueToday = 0;
    let overdue = 0;
    let completedToday = 0;
    let upcomingThisWeek = 0;
    let highPriority = 0;

    tasks.forEach(task => {
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

  const cards = [
    { label: 'Due Today', value: stats.dueToday, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Completed Today', value: stats.completedToday, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Upcoming This Week', value: stats.upcomingThisWeek, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'High Priority', value: stats.highPriority, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
              <div className={cn("p-1.5 rounded-lg", card.bg, card.color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
