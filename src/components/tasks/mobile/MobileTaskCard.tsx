
import { Task, TaskPriority, TaskType } from '../../../types/task';
import { Phone, MessageCircle, Mail, Video, Bell, Clock, CheckCircle2, Circle, Calendar, AlertCircle, User } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface MobileTaskCardProps {
  key?: React.Key;
  task: Task;
  onToggleStatus: (task: Task) => void;
  onClick: (task: Task) => void;
}

export function MobileTaskCard({ task, onToggleStatus, onClick }: MobileTaskCardProps) {
  const navigate = useNavigate();
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent': return 'text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-500';
      case 'High': return 'text-orange-600 bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400';
      case 'Medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400';
      case 'Low': return 'text-green-600 bg-green-100 dark:bg-green-500/10 dark:text-green-500';
      default: return 'text-muted-foreground bg-muted';
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

  const isOverdue = isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'Completed';

  return (
    <div 
      onClick={() => onClick(task)}
      className={cn(
        "bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer mb-3 select-none relative overflow-hidden",
        task.status === 'Completed' && "opacity-60 bg-muted/30"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-3">
          <div className="flex items-center gap-2 mb-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
              className={cn(
                "w-6 h-6 rounded-full flex shrink-0 items-center justify-center border transition-all",
                task.status === 'Completed' 
                  ? "bg-green-500 border-green-500 text-white" 
                  : "border-muted-foreground/30 text-transparent"
              )}
            >
              {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
            <h3 className={cn(
              "font-bold text-[15px] leading-tight",
              task.status === 'Completed' ? "line-through text-muted-foreground" : "text-foreground"
            )}>
              {task.title}
            </h3>
          </div>
          {task.leadName && (
            task.leadId ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/all-leads/${task.leadId}`);
                }}
                className="text-xs text-primary font-medium ml-8 hover:underline text-left"
              >
                {task.leadName}
              </button>
            ) : (
              <p className="text-xs text-muted-foreground font-medium ml-8">{task.leadName}</p>
            )
          )}
          <div className="flex items-center gap-1 mt-1 ml-8 text-[11px] text-muted-foreground/80">
            <User className="w-3 h-3" />
            <span>Assigned to {typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name || 'Unassigned'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4 ml-8">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50 ml-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {getTypeIcon(task.type)}
            <span>{task.type}</span>
          </div>
          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", getPriorityColor(task.priority))}>
            {task.priority}
          </span>
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-semibold",
          isOverdue ? "text-red-600" : "text-muted-foreground"
        )}>
          {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
          {!isOverdue && <Calendar className="w-3.5 h-3.5" />}
          <span>
            {isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM d')}
            {task.dueTime && `, ${task.dueTime}`}
          </span>
        </div>
      </div>
    </div>
  );
}
