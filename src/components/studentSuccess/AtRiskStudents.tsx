
import { Link } from 'react-router-dom';
import { useStudentSuccess } from '../../hooks/useStudentSuccess';
import { AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

const RISK_COLORS: Record<string, string> = {
  'Low Risk': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'Medium Risk': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'High Risk': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'Critical': 'bg-red-500/10 text-red-600 border-red-200',
};

export function AtRiskStudents() {
  const { enrollments, isLoading } = useStudentSuccess();

  const atRisk = enrollments
    .filter(e => ['Medium Risk', 'High Risk', 'Critical'].includes(e.riskLevel))
    .sort((a, b) => a.healthScore - b.healthScore);

  const critical = atRisk.filter(e => e.riskLevel === 'Critical');
  const high = atRisk.filter(e => e.riskLevel === 'High Risk');
  const medium = atRisk.filter(e => e.riskLevel === 'Medium Risk');

  const HealthBar = ({ score }: { score: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}</span>
    </div>
  );

  const RiskSection = ({ title, students, color }: { title: string; students: typeof atRisk; color: string }) => (
    students.length === 0 ? null : (
      <div>
        <h3 className={cn("font-semibold text-sm mb-3 flex items-center gap-2", color)}>
          <AlertTriangle className="w-4 h-4" />
          {title} ({students.length})
        </h3>
        <div className="space-y-2">
          {students.map(e => (
            <Link
              key={e.id}
              to={`/student-success/enrollments/${e.id}`}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                {e.admission?.student_name?.charAt(0) ?? 'S'}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-sm text-foreground">{e.admission?.student_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{e.admission?.university?.name} · {e.enrollmentStatus}</p>
                <HealthBar score={e.healthScore} />
              </div>
              {e.nextActionRecommendation && (
                <div className="hidden md:block max-w-xs">
                  <p className="text-xs text-muted-foreground italic truncate">💡 {e.nextActionRecommendation}</p>
                </div>
              )}
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full border font-medium shrink-0", RISK_COLORS[e.riskLevel])}>
                {e.riskLevel}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">At-Risk Students</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Operational risk indicators based on engagement, onboarding, and support data.
          This does not represent academic performance.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: critical.length, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'High Risk', count: high.length, color: 'text-orange-600', bg: 'bg-orange-500/10' },
          { label: 'Medium Risk', count: medium.length, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={cn("p-4 rounded-xl border flex items-center gap-3", bg, 'border-transparent')}>
            <Activity className={cn("w-5 h-5", color)} />
            <div>
              <p className={cn("text-2xl font-bold", color)}>{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="p-4 bg-card border border-border rounded-xl animate-pulse">
              <div className="h-4 bg-muted rounded w-48 mb-2" />
              <div className="h-3 bg-muted rounded w-64" />
            </div>
          ))}
        </div>
      ) : atRisk.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-emerald-500" />
          </div>
          <p className="font-semibold text-foreground">No at-risk students</p>
          <p className="text-muted-foreground text-sm mt-1">All enrolled students have healthy engagement scores</p>
        </div>
      ) : (
        <div className="space-y-6">
          <RiskSection title="Critical" students={critical} color="text-red-600" />
          <RiskSection title="High Risk" students={high} color="text-orange-600" />
          <RiskSection title="Medium Risk" students={medium} color="text-amber-600" />
        </div>
      )}
    </div>
  );
}
