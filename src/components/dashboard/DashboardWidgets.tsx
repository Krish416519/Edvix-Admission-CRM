import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Phone, Clock, FileText, ArrowRight, PhoneCall, Check, X, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';

// ─── Counselor Performance ─────────────────────────────────────────────────────
interface CounselorStat {
  id: string;
  name: string;
  role: string;
  admissions: number;
  target: number;
  avatar: string | null;
}

export function CounselorPerformance() {
  const { user } = useAuth();
  const [counselors, setCounselors] = useState<CounselorStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        // Current month boundaries
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data: admRows, error: admErr } = await supabase
          .from('admissions')
          .select('assigned_counselor')
          .is('deleted_at', null)
          .neq('admission_status', 'Cancelled')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (admErr) throw admErr;

        // Count admissions per counselor
        const counts: Record<string, number> = {};
        (admRows || []).forEach((r: any) => {
          if (r.assigned_counselor) counts[r.assigned_counselor] = (counts[r.assigned_counselor] || 0) + 1;
        });

        if (Object.keys(counts).length === 0) {
          setCounselors([]);
          setIsLoading(false);
          return;
        }

        // Fetch user details for those counselors
        const counselorIds = Object.keys(counts);
        const { data: userRows, error: usrErr } = await supabase
          .from('users')
          .select('id, name, avatar_url, roles(name)')
          .in('id', counselorIds)
          .eq('is_active', true);

        if (usrErr) throw usrErr;

        const stats: CounselorStat[] = (userRows || [])
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            role: u.roles?.name || 'Counselor',
            admissions: counts[u.id] || 0,
            target: 30, // Default monthly target — configurable per org
            avatar: u.avatar_url,
          }))
          .sort((a, b) => b.admissions - a.admissions)
          .slice(0, 4);

        setCounselors(stats);
      } catch (err) {
        console.error('[CounselorPerformance] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Counselor Performance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly targets & achievements</p>
        </div>
      </div>
      <div className="flex-1 space-y-6 relative">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        )}
        {!isLoading && counselors.length === 0 && (
          <p className="text-sm text-muted-foreground">No admissions recorded this month.</p>
        )}
        {!isLoading && counselors.map((c) => {
          const progress = Math.min(100, Math.round((c.admissions / c.target) * 100));
          return (
            <div key={c.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-full border border-border object-cover shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center text-muted-foreground">
                      <User className="w-5 h-5" />
                    </div>
                  )}
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

// ─── Recent Activities ─────────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, any> = {
  application_submitted: FileText,
  lead_assigned: User,
  payment_received: CheckCircle2,
  call: Phone,
  note_added: FileText,
  status_changed: CheckCircle2,
  default: User,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function RecentActivities({ onViewAll }: { onViewAll?: () => void }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('lead_activities')
          .select('id, type, content, created_at, author, lead:leads!lead_id(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        setActivities(data || []);
      } catch (err) {
        console.error('[RecentActivities] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Activities</h2>
        <button onClick={onViewAll} className="text-sm text-primary hover:text-primary-hover font-medium transition-colors">View all</button>
      </div>
      <div className="flex-1">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}
        {!isLoading && activities.length === 0 && (
          <p className="text-sm text-muted-foreground">No recent activities.</p>
        )}
        {!isLoading && (
          <div className="space-y-6">
            {activities.map((item, i) => {
              const IconComp = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.default;
              const leadName = item.lead ? `${item.lead.first_name || ''} ${item.lead.last_name || ''}`.trim() : '';
              const desc = item.content || (leadName ? `Activity for ${leadName}` : 'Activity logged');
              return (
                <div key={item.id} className="flex gap-4 relative">
                  {i !== activities.length - 1 && (
                    <div className="absolute top-8 bottom-[-24px] left-[19px] w-px bg-border" />
                  )}
                  <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-card shadow-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="pb-1 pt-0.5">
                    <p className="text-sm font-semibold text-foreground leading-tight capitalize">{(item.type || 'Activity').replace(/_/g, ' ')}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{desc}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground/70 mt-1.5 uppercase tracking-wider">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Tasks ────────────────────────────────────────────────────────────
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
              <div
                key={task.id}
                onClick={onNavigate}
                className={cn("group flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer", isOverdue ? "border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-900/10" : "border-transparent hover:border-border hover:bg-muted/50")}
              >
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

// ─── Today's Calls ─────────────────────────────────────────────────────────────
interface CallTask {
  id: string;
  name: string;
  course: string;
  time: string;
  status: 'pending' | 'completed' | 'missed';
  taskId: string;
}

export function TodaysCalls() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const query = supabase
        .from('tasks')
        .select(`
          id, title, due_time, status, task_type,
          lead:leads!tasks_lead_id_fkey(first_name, last_name, course:courses(name))
        `)
        .eq('due_date', today)
        .is('deleted_at', null)
        .in('task_type', ['Call', 'Follow-up Call', 'Phone Call', 'Scheduled Call'])
        .order('due_time', { ascending: true })
        .limit(4);

      // Role-based isolation
      if (user.role !== 'Super Admin' && user.role !== 'Admin') {
        query.eq('assigned_user', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: CallTask[] = (data || []).map((t: any) => {
        const firstName = t.lead?.first_name || '';
        const lastName = t.lead?.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || t.title;
        const course = t.lead?.course?.name || '—';
        const timeStr = t.due_time
          ? new Date(`1970-01-01T${t.due_time}`).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—';
        const status: 'pending' | 'completed' | 'missed' =
          t.status === 'Completed' ? 'completed' :
          (t.status === 'Missed' || (t.due_time && t.status === 'Pending' && new Date(`${today}T${t.due_time}`) < new Date())) ? 'missed' :
          'pending';

        return { id: t.id, name, course, time: timeStr, status, taskId: t.id };
      });

      setCalls(mapped);
    } catch (err) {
      console.error('[TodaysCalls] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, today]);

  useEffect(() => { load(); }, [load]);

  const markComplete = async (taskId: string) => {
    await supabase.from('tasks').update({ status: 'Completed', completed_date: new Date().toISOString() }).eq('id', taskId);
    load();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Today's Calls</h2>
        <div className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[11px] font-bold uppercase tracking-wider">
          {calls.filter(c => c.status === 'pending').length} Pending
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        )}
        {!isLoading && calls.length === 0 && (
          <p className="text-sm text-muted-foreground">No calls scheduled for today.</p>
        )}
        {!isLoading && calls.map((call) => (
          <div key={call.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors shadow-sm">
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
              <button
                onClick={() => markComplete(call.taskId)}
                title="Mark as completed"
                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/80 shadow-sm transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
