import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, GraduationCap, IndianRupee, PieChart, 
  ArrowUpRight, ArrowDownRight, Activity, Clock 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useLeads } from '../../hooks/useLeads';
import { useAdmissions } from '../../hooks/useAdmissions';
import { useFinance } from '../../hooks/useFinance';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const mockChartData = [
  { name: 'Jan', leads: 40, admissions: 24 },
  { name: 'Feb', leads: 30, admissions: 13 },
  { name: 'Mar', leads: 20, admissions: 98 },
  { name: 'Apr', leads: 27, admissions: 39 },
  { name: 'May', leads: 18, admissions: 48 },
  { name: 'Jun', leads: 23, admissions: 38 },
  { name: 'Jul', leads: 34, admissions: 43 },
];

export function PartnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leads, isLoading: leadsLoading } = useLeads();
  const { admissions, isLoading: admissionsLoading } = useAdmissions();
  const { partnerCommissions, isLoading: financeLoading } = useFinance();

  // Leads and admissions are automatically filtered by RLS policies 
  // (We add client-side filtering so Super Admins testing the view only see their own partner data)
  const myLeads = leads.filter(l => l.partner_id === user?.id);
  const myAdmissions = admissions.filter(a => a.lead_id && myLeads.find(l => l.id === a.lead_id));

  const isLoading = leadsLoading || admissionsLoading || financeLoading;

  const totalLeads = myLeads.length;
  const activeLeads = myLeads.filter(l => l.status !== 'Lost' && l.status !== 'Admission Done').length;
  const admissionsCompleted = myAdmissions.filter(a => a.stage === 'Admission Completed').length;
  const pendingAdmissions = myAdmissions.length - admissionsCompleted;
  const conversionRate = totalLeads ? Math.round((admissionsCompleted / totalLeads) * 100) : 0;
  
  const totalEarnings = partnerCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const pendingCommission = partnerCommissions.filter(c => c.commission_status === 'Pending').reduce((sum, c) => sum + (c.net_commission || 0), 0);

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

  const stats = [
    { name: 'Total Leads', value: totalLeads, change: '+12%', trend: 'up', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'Active Leads', value: activeLeads, change: '+4%', trend: 'up', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Completed Admissions', value: admissionsCompleted, change: '+2', trend: 'up', icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Conversion Rate', value: `${conversionRate}%`, change: '-1%', trend: 'down', icon: PieChart, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const financeStats = [
    { name: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Pending Commission', value: `₹${pendingCommission.toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Partner Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here is what's happening with your leads.</p>
        </div>
        <button 
          onClick={() => navigate('/partner/leads')}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Submit New Lead
        </button>
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
          <h2 className="text-lg font-semibold text-foreground mb-6">Performance Overview</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="admissions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAdmissions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Earnings Summary</h2>
            <div className="space-y-4">
              {financeStats.map((stat) => (
                <div key={stat.name} className="flex items-center p-4 rounded-lg bg-muted/50 border border-border">
                  <div className={cn("p-2 rounded-lg mr-4", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { title: 'Commission Paid', desc: '₹15,000 for Aarav Patel', time: '2 hours ago', icon: IndianRupee, color: 'text-emerald-500' },
                { title: 'Admission Completed', desc: 'Sneha Reddy - MCA', time: '5 hours ago', icon: GraduationCap, color: 'text-blue-500' },
                { title: 'Lead Assigned', desc: 'Rahul Sharma assigned to Counselor', time: '1 day ago', icon: Users, color: 'text-indigo-500' }
              ].map((activity, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <div className="p-1.5 rounded-full bg-muted border border-border">
                      <activity.icon className={cn("w-3.5 h-3.5", activity.color)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.desc}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{activity.time}</p>
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
