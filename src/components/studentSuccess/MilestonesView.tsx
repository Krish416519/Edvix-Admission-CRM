
import { Link } from 'react-router-dom';
import { useStudentSuccess } from '../../hooks/useStudentSuccess';
import { CheckSquare, GraduationCap, CheckCircle, Circle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

const MILESTONES = [
  { key: 'Admission Confirmed', label: 'Admission', icon: '🎓' },
  { key: 'Payment Completed', label: 'Fee Paid', icon: '💳' },
  { key: 'Enrollment Confirmed', label: 'Enrolled', icon: '📋' },
  { key: 'Student ID Received', label: 'Student ID', icon: '🪪' },
  { key: 'LMS Access Activated', label: 'LMS Access', icon: '💻' },
  { key: 'Active Student', label: 'Active', icon: '✅' },
  { key: 'Completed', label: 'Completed', icon: '🏆' },
];

const STATUS_ORDER: Record<string, number> = {};
MILESTONES.forEach((m, i) => { STATUS_ORDER[m.key] = i; });

export function MilestonesView() {
  const { enrollments, isLoading } = useStudentSuccess();

  const getReachedIndex = (status: string) => {
    const idx = STATUS_ORDER[status];
    return idx !== undefined ? idx : -1;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Milestones</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Lifecycle progress tracker for enrolled students</p>
      </div>

      {/* Milestone Legend */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground text-sm mb-4">Lifecycle Stages</h3>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {MILESTONES.map((m, i) => (
            <React.Fragment key={m.key}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  {m.icon}
                </div>
                <span className="text-xs text-muted-foreground text-center w-16 leading-tight">{m.label}</span>
              </div>
              {i < MILESTONES.length - 1 && (
                <div className="flex-1 h-0.5 bg-border min-w-[20px] mx-1 mt-[-18px]" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Students Progress */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-5 bg-card border border-border rounded-xl animate-pulse">
              <div className="h-4 bg-muted rounded w-48 mb-3" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">No enrollments yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create an enrollment to track milestones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments
            .filter(e => !['Withdrawn', 'Deferred'].includes(e.enrollmentStatus))
            .map(enrollment => {
              const reachedIdx = getReachedIndex(enrollment.enrollmentStatus);
              const progress = Math.max(0, ((reachedIdx + 1) / MILESTONES.length) * 100);

              return (
                <Link
                  key={enrollment.id}
                  to={`/student-success/enrollments/${enrollment.id}`}
                  className="block p-5 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {enrollment.admission?.student_name?.charAt(0) ?? 'S'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{enrollment.admission?.student_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{enrollment.admission?.university?.name}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary">{Math.round(progress)}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Milestones dots */}
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {MILESTONES.map((m, i) => {
                      const isCompleted = i <= reachedIdx;
                      const isCurrent = i === reachedIdx + 1;
                      return (
                        <div key={m.key} className="flex items-center gap-1">
                          <div
                            title={m.label}
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all",
                              isCompleted ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary/40" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isCompleted ? '✓' : m.icon}
                          </div>
                          {i < MILESTONES.length - 1 && (
                            <div className={cn("h-0.5 w-3 shrink-0", isCompleted ? "bg-emerald-500" : "bg-border")} />
                          )}
                        </div>
                      );
                    })}
                    <span className="ml-2 text-xs text-muted-foreground shrink-0">{enrollment.enrollmentStatus}</span>
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
