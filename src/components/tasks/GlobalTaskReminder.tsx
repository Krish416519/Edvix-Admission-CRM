import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GlobalTaskReminder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkTasks = async () => {
      // Get current date and time
      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const todayStr = `${localYear}-${localMonth}-${localDay}`;
      
      const future15 = new Date(now.getTime() + 15 * 60000);
      const futureHour = String(future15.getHours()).padStart(2, '0');
      const futureMin = String(future15.getMinutes()).padStart(2, '0');
      const timeStr = `${futureHour}:${futureMin}`;

      // Fetch pending tasks due today or earlier for this user
      const { data, error } = await supabase
        .from('tasks')
        .select('*, lead:leads!tasks_lead_id_fkey(first_name, last_name)')
        .eq('assigned_user', user.id)
        .eq('status', 'Pending')
        .lte('due_date', todayStr)
        .is('deleted_at', null);

      if (error || !data) return;

      const newNotified = new Set(notifiedTasks);

      data.forEach((task: any) => {
        if (newNotified.has(task.id)) return;

        // If task is due today, check time
        if (task.due_date === todayStr) {
          if (task.due_time && task.due_time <= timeStr) {
            showReminder(task);
            newNotified.add(task.id);
          } else if (!task.due_time) {
            // Task has no time, just due today
            showReminder(task);
            newNotified.add(task.id);
          }
        } 
        // If task is overdue (past date), just remind once
        else if (task.due_date < todayStr) {
          showReminder(task);
          newNotified.add(task.id);
        }
      });

      if (newNotified.size > notifiedTasks.size) {
        setNotifiedTasks(newNotified);
      }
    };

    const showReminder = (task: any) => {
      const leadName = task.lead ? `${task.lead.first_name} ${task.lead.last_name || ''}`.trim() : 'Unknown Lead';
      
      toast(
        <div className="flex flex-col gap-2 w-full pr-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Bell className="w-4 h-4 text-primary animate-pulse" />
            <span>Upcoming Task</span>
          </div>
          <p className="text-sm font-medium">{task.title}</p>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Due: {task.due_date} {task.due_time || ''}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                toast.dismiss(task.id);
                if (task.lead_id) {
                  navigate(`/leads/${task.lead_id}`);
                } else {
                  navigate('/tasks');
                }
              }}
              className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs rounded-md font-medium flex-1 shadow-sm transition-colors hover:bg-primary/90"
            >
              View Task
            </button>
            <button
              onClick={async () => {
                await supabase.from('tasks').update({ status: 'Completed', completed_date: new Date().toISOString() }).eq('id', task.id);
                toast.dismiss(task.id);
                toast.success('Task marked as completed');
              }}
              className="px-2.5 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded-md font-medium flex items-center justify-center gap-1.5 flex-1 transition-colors hover:bg-green-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Done
            </button>
          </div>
        </div>,
        {
          id: task.id,
          duration: 30000, // 30 seconds
          position: 'top-right',
        }
      );
    };

    // Initial check (delay slightly so user has time to load)
    const timeout = setTimeout(checkTasks, 2000);

    // Check every 1 minute
    const interval = setInterval(checkTasks, 60000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user, notifiedTasks, navigate]);

  return null;
}
