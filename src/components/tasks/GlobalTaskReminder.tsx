import { toast } from 'sonner';
import { Bell, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// We export this pure UI function so it can be called by the central NotificationContext Realtime listener
export function showTaskReminderToast(task: any) {
  const leadName = task.lead ? `${task.lead.first_name} ${task.lead.last_name || ''}`.trim() : 'Unknown Lead';
  
  toast.custom(
    (t) => (
      <div className="relative overflow-hidden w-full sm:w-[380px] bg-card border border-border/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-300">
        {/* Glowing Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
        
        <div className="p-5 flex gap-4">
          {/* Icon Container with Pulse */}
          <div className="shrink-0 relative flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mt-1">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-50 duration-1000" />
            <Bell className="w-6 h-6 text-primary relative z-10" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Upcoming Task</h3>
              <button 
                onClick={() => typeof t === 'number' || typeof t === 'string' ? toast.dismiss(t) : toast.dismiss()} 
                className="p-1 -mr-2 -mt-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-base font-semibold text-foreground truncate mb-1.5" title={task.title}>
              {task.title}
            </p>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
              <Clock className="w-3.5 h-3.5" /> 
              <span className="font-medium text-foreground/80">Due:</span> {task.due_date} {task.due_time || ''}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (typeof t === 'number' || typeof t === 'string') toast.dismiss(t); else toast.dismiss();
                  // Navigate to task via metadata.link if available, otherwise fallback
                  if (task.metadata?.link) {
                    window.location.href = task.metadata.link;
                  } else if (task.lead_id) {
                    window.location.href = `/all-leads/${task.lead_id}`;
                  } else {
                    window.location.href = '/tasks';
                  }
                }}
                className="flex-1 flex items-center justify-center py-2 px-3 bg-primary text-primary-foreground text-sm font-semibold rounded-lg shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
              >
                View Task
              </button>
              <button
                onClick={async () => {
                  await supabase.from('tasks').update({ status: 'Completed', completed_date: new Date().toISOString() }).eq('id', task.id);
                  if (typeof t === 'number' || typeof t === 'string') toast.dismiss(t); else toast.dismiss();
                  toast.success('Task marked as completed');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm font-semibold rounded-lg transition-all hover:bg-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      id: task.id,
      duration: 5000, // exactly 5 seconds per business requirement
      position: 'top-right',
    }
  );
}

// Keep a dummy component export so we don't break App.tsx if it was rendered there
export function GlobalTaskReminder() {
  return null;
}
