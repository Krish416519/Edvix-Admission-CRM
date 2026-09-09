import React, { useState, useEffect } from 'react';
import {
  Target, Phone, FileText, CreditCard, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, Sparkles, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { MissionGenerator } from '../../lib/ai/MissionGenerator';
import { CommandMission, MissionType } from '../../types/commandCenter';
import { useNavigate } from 'react-router-dom';

const MISSION_ICONS: Record<MissionType, React.ElementType> = {
  call: Phone,
  followup: Clock,
  document: FileText,
  payment: CreditCard,
  review: Target,
  alert: AlertTriangle,
};

const PRIORITY_BADGES: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  Medium: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  High: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200',
  Critical: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200',
};

export function DailyMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<CommandMission[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = `edvix_completed_missions_${new Date().toISOString().split('T')[0]}`;

  const loadMissions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await MissionGenerator.generateCommandMissions(user.id, user.role || 'Counselor');
      
      // Hydrate completion from localStorage
      const savedCompleted = JSON.parse(localStorage.getItem(todayKey) || '[]') as string[];
      const hydrated = data.map(m => ({
        ...m,
        completed: savedCompleted.includes(m.id),
      }));

      setMissions(hydrated);
    } catch (e) {
      console.error('Failed to generate command missions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, [user]);

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMissions(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
      const completedIds = updated.filter(m => m.completed).map(m => m.id);
      try {
        localStorage.setItem(todayKey, JSON.stringify(completedIds));
      } catch (err) {
        console.error('Error saving mission state:', err);
      }
      return updated;
    });
  };

  const completedCount = missions.filter(m => m.completed).length;
  const progress = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/2 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Operational Missions</h3>
            <p className="text-[11px] text-muted-foreground">Prioritized actions for today</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-foreground">{completedCount}/{missions.length}</span>
            <span className="text-[10px] text-muted-foreground block">Completed</span>
          </div>
          <button
            onClick={loadMissions}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Refresh missions"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted/60 h-1.5 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 rounded-r-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mission List */}
      <div className="divide-y divide-border/60 overflow-y-auto max-h-[380px] custom-scrollbar flex-1">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground space-y-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Evaluating operational debt...</p>
          </div>
        ) : missions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Zero Backlog</p>
            <p className="text-xs">No pending collections or overdue tasks today.</p>
          </div>
        ) : (
          missions.map(mission => {
            const Icon = MISSION_ICONS[mission.type] || Target;
            const priorityClass = PRIORITY_BADGES[mission.priority] || PRIORITY_BADGES.Medium;

            return (
              <div
                key={mission.id}
                className={cn(
                  "p-4 transition-all hover:bg-muted/30 flex items-start gap-3.5 group cursor-pointer",
                  mission.completed && "opacity-60 bg-muted/10"
                )}
                onClick={() => navigate(mission.actionRoute)}
              >
                {/* Complete Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => toggleComplete(mission.id, e)}
                  aria-label={mission.completed ? "Mark incomplete" : "Mark complete"}
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                    mission.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40 hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {mission.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border", priorityClass)}>
                      {mission.priority}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                      {mission.category}
                    </span>
                  </div>

                  <p className={cn("text-sm font-semibold text-foreground leading-snug", mission.completed && "line-through text-muted-foreground")}>
                    {mission.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {mission.description}
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                      {mission.actionLabel} <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Type Icon */}
                <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground shrink-0 group-hover:text-primary transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
