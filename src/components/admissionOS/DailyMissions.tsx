import { useState, useEffect } from 'react';
import {
  Target, Phone, FileText, CreditCard, AlertTriangle, CheckCircle2,
  Brain, Loader2, ChevronRight, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { MissionGenerator } from '../../lib/ai/MissionGenerator';
import { DailyMission } from '../../lib/ai/AdmissionOS';
import { useNavigate } from 'react-router-dom';

const MISSION_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  followup: ChevronRight,
  document: FileText,
  payment: CreditCard,
  review: Clock,
  alert: AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'border-l-slate-400',
  Medium: 'border-l-blue-500',
  High: 'border-l-amber-500',
  Critical: 'border-l-red-500',
};

export function DailyMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const data = await MissionGenerator.generate(user.id, user.role || 'Counselor');
        setMissions(data);
      } catch (e) {
        console.error('Failed to generate missions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const toggleComplete = (id: string) => {
    setMissions(prev => prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };

  const completedCount = missions.filter(m => m.completed).length;
  const progress = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-primary animate-pulse" />
          <span className="font-semibold text-sm">Generating your daily missions...</span>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-semibold">All clear!</p>
        <p className="text-xs text-muted-foreground mt-1">No urgent missions for today.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm">Today's AI Missions</h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {completedCount}/{missions.length}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Mission List */}
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scrollbar">
        {missions.map(mission => {
          const Icon = MISSION_ICONS[mission.type] || Target;
          return (
            <div
              key={mission.id}
              className={cn(
                "flex items-start gap-3 px-5 py-3.5 border-l-4 transition-all hover:bg-muted/30",
                PRIORITY_COLORS[mission.priority],
                mission.completed && 'opacity-50'
              )}
            >
              <button
                onClick={() => toggleComplete(mission.id)}
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  mission.completed
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-border hover:border-primary'
                )}
              >
                {mission.completed && <CheckCircle2 className="w-3 h-3" />}
              </button>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  if (mission.entityId && mission.entityType === 'Lead') {
                    navigate(`/leads/${mission.entityId}`);
                  }
                }}
              >
                <p className={cn("text-sm font-medium", mission.completed && 'line-through')}>
                  {mission.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
              </div>
              <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
