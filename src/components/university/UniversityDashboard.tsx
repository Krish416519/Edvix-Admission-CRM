import React, { useMemo } from 'react';
import { 
  Users, GraduationCap, Building2, PieChart, 
  ArrowUpRight, ArrowDownRight, Wallet, Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLeads } from '../../hooks/useLeads';
import { useAdmissions } from '../../hooks/useAdmissions';
import { useFinance } from '../../hooks/useFinance';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '../ui/Skeleton';

const mockChartData = [
  { name: 'Jan', applicants: 120, enrolled: 85 },
  { name: 'Feb', applicants: 150, enrolled: 110 },
  { name: 'Mar', applicants: 200, enrolled: 175 },
  { name: 'Apr', applicants: 180, enrolled: 140 },
  { name: 'May', applicants: 250, enrolled: 210 },
  { name: 'Jun', applicants: 300, enrolled: 260 },
];

export function UniversityDashboard() {
  const { leads, isLoading: leadsLoading } = useLeads();
  const { admissions, isLoading: admissionsLoading } = useAdmissions();
  const { universityPayouts } = useFinance();

  // RLS filters the data naturally so we don't need mock JS filters
  const isLoading = leadsLoading || admissionsLoading;

  const activeLeads = leads.filter(l => l.status !== 'Lost' && l.status !== 'Admission Done').length;
  const enrolledStudents = admissions.filter(a => a.stage === 'Admission Completed').length;
  const pendingVerifications = admissions.filter(a => a.stage === 'Document Verification').length;
  
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const totalPayout = universityPayouts.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
  const pendingSettlement = universityPayouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.pending_amount || 0), 0);

  const stats = [
    { name: 'Enrolled Students', value: enrolledStudents, change: '+24%', trend: 'up', icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Interested Leads', value: activeLeads, change: '+12%', trend: 'up', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Pending Verifications', value: pendingVerifications, change: '-5%', trend: 'down', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Total Settlement', value: `₹${totalPayout.toLocaleString('en-IN')}`, change: '+18%', trend: 'up', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">University Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome, Amity University Representative.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
            <dt>
              <div className={cn("absolute rounded-lg p-3", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-muted-foreground">{stat.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className={cn(
                "ml-2 flex items-baseline text-sm font-semibold",
                stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 shrink-0 self-center" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 shrink-0 self-center" aria-hidden="true" />
                )}
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Enrollment Trends</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApplicants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnrolled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="applicants" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorApplicants)" />
                <Area type="monotone" dataKey="enrolled" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrolled)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Pending Actions</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Document Verifications</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-background text-foreground font-bold text-sm shadow-sm">{pendingVerifications}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Pending Settlements</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-background text-foreground font-bold text-sm shadow-sm">₹{pendingSettlement.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Enrollments</h2>
            <div className="space-y-4">
              {admissions.slice(0, 3).map((adm, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{adm.studentName}</p>
                    <p className="text-xs text-muted-foreground">{adm.course}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
