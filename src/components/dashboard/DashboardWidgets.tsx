import { CheckCircle2, Phone, Clock, FileText, ArrowRight, PhoneCall, Check, X, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CounselorPerformance() {
  const counselors = [
    { name: 'Ankit Sharma', role: 'Sr. Counselor', admissions: 45, target: 50, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
    { name: 'Priya Singh', role: 'Counselor', admissions: 32, target: 40, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704e' },
    { name: 'Rahul Verma', role: 'Counselor', admissions: 28, target: 40, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704f' },
    { name: 'Sneha Patel', role: 'Jr. Counselor', admissions: 15, target: 25, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704g' },
  ];

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Counselor Performance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly targets & achievements</p>
        </div>
      </div>
      <div className="flex-1 space-y-6">
        {counselors.map((c, i) => {
          const progress = Math.min(100, (c.admissions / c.target) * 100);
          return (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full border border-border object-cover shadow-sm" />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{c.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{c.admissions} / <span className="text-muted-foreground">{c.target}</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">admissions</p>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", progress >= 90 ? "bg-green-500" : "bg-primary")} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecentActivities({ onViewAll }: { onViewAll?: () => void }) {
  const activities = [
    { title: 'Application submitted', desc: 'Rahul Verma submitted PG MBA app', time: '10 mins ago', type: 'app', icon: FileText },
    { title: 'New lead assigned', desc: 'Priya Singh added to your queue', time: '1 hour ago', type: 'lead', icon: User },
    { title: 'Payment received', desc: 'Registration fee for UG B.Tech', time: '2 hours ago', type: 'pay', icon: CheckCircle2 },
    { title: 'Follow-up completed', desc: 'Spoke with Amit regarding CU', time: '5 hours ago', type: 'call', icon: Phone },
  ];

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Activities</h2>
        <button onClick={onViewAll} className="text-sm text-primary hover:text-primary-hover font-medium transition-colors">View all</button>
      </div>
      <div className="flex-1">
        <div className="space-y-6">
          {activities.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              {i !== activities.length - 1 && (
                <div className="absolute top-8 bottom-[-24px] left-[19px] w-px bg-border" />
              )}
              <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-card shadow-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                <item.icon className="w-4 h-4" />
              </div>
              <div className="pb-1 pt-0.5">
                <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                <p className="text-[11px] font-semibold text-muted-foreground/70 mt-1.5 uppercase tracking-wider">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useTasks } from '../../hooks/useTasks';
import { Skeleton } from '../ui/Skeleton';

export function UpcomingTasks({ onNavigate }: { onNavigate?: () => void }) {
  const { tasks, isLoading } = useTasks();
  const pendingTasks = tasks.filter(t => t.status === 'Pending').slice(0, 4);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Pending Tasks</h2>
        <button onClick={onNavigate} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors" title="View all tasks">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 space-y-3 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {pendingTasks.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">No pending tasks.</p>
        ) : (
          pendingTasks.map((task) => {
            const isOverdue = new Date(task.dueDate) < new Date() && new Date(task.dueDate).setHours(0,0,0,0) !== new Date().setHours(0,0,0,0);
            
            return (
              <div key={task.id} className={cn("group flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer", isOverdue ? "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-900/10" : "border-transparent hover:border-border hover:bg-muted/50")}>
                <div className="mt-0.5 w-5 h-5 rounded border border-muted-foreground/40 flex items-center justify-center group-hover:border-primary transition-colors bg-card shadow-sm">
                  <Check className="w-3 h-3 text-transparent group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={cn("text-xs font-medium", isOverdue ? "text-red-600 dark:text-red-500" : "text-muted-foreground")}>
                      {new Date(task.dueDate).toLocaleDateString()} {isOverdue && '(Overdue)'}
                    </span>
                    <span className={cn(
                      "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      task.priority === 'High' ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500" :
                      task.priority === 'Medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500" :
                      "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500"
                    )}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function TodaysCalls() {
  const calls = [
    { name: 'Vivek Sharma', course: 'B.Tech CSE', time: '11:30 AM', status: 'pending' },
    { name: 'Neha Gupta', course: 'MBA HR', time: '01:00 PM', status: 'completed' },
    { name: 'Aryan Khan', course: 'BBA', time: '02:30 PM', status: 'pending' },
    { name: 'Kritika Singh', course: 'M.Tech', time: '04:15 PM', status: 'missed' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Today's Calls</h2>
        <div className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
          {calls.filter(c => c.status === 'pending').length} Pending
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {calls.map((call, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                call.status === 'completed' ? "bg-green-100 text-green-600 dark:bg-green-500/10" :
                call.status === 'missed' ? "bg-red-100 text-red-600 dark:bg-red-500/10" :
                "bg-blue-100 text-blue-600 dark:bg-blue-500/10"
              )}>
                {call.status === 'completed' ? <Check className="w-4 h-4" /> : 
                 call.status === 'missed' ? <X className="w-4 h-4" /> : 
                 <PhoneCall className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{call.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-medium">{call.course}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs font-semibold text-foreground">{call.time}</span>
                </div>
              </div>
            </div>
            {call.status === 'pending' && (
              <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover shadow-sm transition-transform active:scale-95">
                <Phone className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
