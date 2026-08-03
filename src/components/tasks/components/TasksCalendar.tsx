import React, { useState } from 'react';
import { Task } from '../../../types/task';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '../../../lib/utils';

export function TasksCalendar({ tasks }: { tasks: Task[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <h2 className="text-lg font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted/10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, dayIdx) => {
          const dayTasks = tasks.filter(t => isSameDay(new Date(t.dueDate), day));
          return (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[100px] border-b border-r border-border p-2",
                !isSameMonth(day, currentDate) && "bg-muted/30 opacity-50",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className={cn(
                "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
              )}>
                {format(day, 'd')}
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] hide-scrollbar">
                {dayTasks.map(task => (
                  <div key={task.id} className={cn(
                    "text-xs px-1.5 py-1 rounded truncate",
                    task.status === 'Completed' ? "bg-muted text-muted-foreground line-through" : 
                    task.priority === 'Urgent' || task.priority === 'High' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  )}>
                    {task.dueTime ? `${task.dueTime} ` : ''}{task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
