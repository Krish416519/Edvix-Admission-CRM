
import { Link } from 'react-router-dom';
import {
  GraduationCap, AlertTriangle, CheckCircle, LifeBuoy,
  TrendingUp, Clock, Users, Activity, ArrowRight, Zap
} from 'lucide-react';
import { useStudentSuccess } from '../../hooks/useStudentSuccess';
import { useStudentSupportTickets } from '../../hooks/useStudentSuccess';
import { cn } from '../../lib/utils';

function StatCard({ label, value, icon: Icon, color, to }: {
  label: string; value: string | number; icon: any; color: string; to?: string;
}) {
  const inner = (
    <div className={cn(
      "p-5 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all group",
      to && "cursor-pointer hover:-translate-y-0.5"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {to && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 group-hover:text-primary transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function StudentSuccessDashboard() {
  const { enrollments, isLoading } = useStudentSuccess();
  const { tickets } = useStudentSupportTickets();

  const active = enrollments.filter(e => e.enrollmentStatus === 'Active Student').length;
  const pendingOnboarding = enrollments.filter(e =>
    ['Admission Confirmed', 'Payment Pending', 'Enrollment Initiated', 'Enrollment Submitted'].includes(e.enrollmentStatus)
  ).length;
  const lmsPending = enrollments.filter(e =>
    ['LMS Access Pending', 'Student ID Pending', 'Student ID Received'].includes(e.enrollmentStatus)
  ).length;
  const atRisk = enrollments.filter(e => ['High Risk', 'Critical'].includes(e.riskLevel)).length;
  const openTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const orientationPending = enrollments.filter(e => e.orientationStatus === 'Pending' && e.healthScore > 0).length;

  const recentEnrollments = enrollments.slice(0, 6);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low Risk': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Medium Risk': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'High Risk': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Critical': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Success</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage enrolled students, support tickets, and lifecycle milestones</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Active Students" value={isLoading ? '—' : active} icon={Users} color="bg-emerald-500/10 text-emerald-500" to="/student-success/enrollments" />
        <StatCard label="Onboarding Pending" value={isLoading ? '—' : pendingOnboarding} icon={Clock} color="bg-blue-500/10 text-blue-500" to="/student-success/enrollments" />
        <StatCard label="LMS Pending" value={isLoading ? '—' : lmsPending} icon={Activity} color="bg-purple-500/10 text-purple-500" />
        <StatCard label="Orientation Pending" value={isLoading ? '—' : orientationPending} icon={GraduationCap} color="bg-indigo-500/10 text-indigo-500" />
        <StatCard label="Open Tickets" value={isLoading ? '—' : openTickets} icon={LifeBuoy} color="bg-amber-500/10 text-amber-500" to="/student-success/support" />
        <StatCard label="At-Risk Students" value={isLoading ? '—' : atRisk} icon={AlertTriangle} color="bg-red-500/10 text-red-500" to="/student-success/at-risk" />
      </div>

      {/* Recent Enrollments */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Enrollments</h2>
          <Link to="/student-success/enrollments" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-48" />
                  <div className="h-3 bg-muted rounded animate-pulse w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : recentEnrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <GraduationCap className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">No enrollments yet</p>
            <p className="text-xs text-muted-foreground mt-1">Enrollments are created when admissions are confirmed</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentEnrollments.map(enrollment => (
              <Link
                key={enrollment.id}
                to={`/student-success/enrollments/${enrollment.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                  {enrollment.admission?.student_name?.charAt(0) ?? 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {enrollment.admission?.student_name ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {enrollment.admission?.university?.name ?? 'Unknown University'} · {enrollment.admission?.course?.name ?? '—'}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {enrollment.enrollmentStatus}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border", getRiskColor(enrollment.riskLevel))}>
                    {enrollment.riskLevel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/student-success/support" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Support Desk</p>
            <p className="text-xs text-muted-foreground">{openTickets} open tickets</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link to="/student-success/at-risk" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">At-Risk Students</p>
            <p className="text-xs text-muted-foreground">{atRisk} need attention</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        <Link to="/student-success/milestones" className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all group">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Milestones</p>
            <p className="text-xs text-muted-foreground">Track student progress</p>
          </div>
          <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
      </div>
    </div>
  );
}
