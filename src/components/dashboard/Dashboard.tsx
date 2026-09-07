import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from './StatCard';
import { RevenueChart, LeadsSourceChart, AdmissionsByUniChart } from './DashboardCharts';
import { CounselorPerformance, RecentActivities, UpcomingTasks, TodaysCalls } from './DashboardWidgets';
import { AIDailyBriefing } from './AIDailyBriefing';
import { Users, UserPlus, GraduationCap, IndianRupee, Percent, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { LeadFormModal } from '../leads/LeadFormModal';
import { createLeadDirect } from '../../lib/leadService';

interface DashboardStats {
  total: number;
  newLeads: number;
  admissionsDone: number;
  conversionRate: number;
  revenueMTD: number;
}

function formatRevenue(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({ total: 0, newLeads: 0, admissionsDone: 0, conversionRate: 0, revenueMTD: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false); // Don't hang on loading if not logged in
      return;
    }
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const canViewTeamMetrics = user.isSystemAdmin || user.isDomainAdmin || user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Manager' || user.role === 'Team Leader';
      const isCounselor = !canViewTeamMetrics;

      const leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null);
      const newLeadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('lead_status', 'New');
      const admissionsQuery = supabase.from('admissions').select('*', { count: 'exact', head: true }).is('deleted_at', null).neq('admission_status', 'Cancelled');

      // For counselors, scope to their own records
      if (isCounselor) {
        leadsQuery.eq('assigned_counselor', user.id);
        newLeadsQuery.eq('assigned_counselor', user.id);
        admissionsQuery.eq('assigned_counselor', user.id);
      }

      const [totalRes, newRes, admRes, revenueRes] = await Promise.all([
        leadsQuery,
        newLeadsQuery,
        admissionsQuery,
        supabase.from('payments').select('amount').eq('status', 'Completed').gte('created_at', startOfMonth),
      ]);

      if (totalRes.error) throw totalRes.error;
      if (newRes.error) throw newRes.error;
      if (admRes.error) throw admRes.error;

      const total = totalRes.count ?? 0;
      const newLeads = newRes.count ?? 0;
      const admissionsDone = admRes.count ?? 0;
      const conversionRate = total > 0 ? Math.round((admissionsDone / total) * 100) : 0;
      const revenueMTD = revenueRes.error ? 0 : (revenueRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({ total, newLeads, admissionsDone, conversionRate, revenueMTD });
    } catch (err: any) {
      console.error('[Dashboard] Failed to fetch stats:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();

    // Subscribe to any change on leads table to keep stats live
    const channel = supabase
      .channel('dashboard_stats_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchStats())
      .subscribe();

    // Also poll every 60s as a safety net for bulk imports
    const interval = setInterval(fetchStats, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats };
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, isLoading, refresh } = useDashboardStats();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleCreateLead = async (data: any) => {
    try {
      await createLeadDirect(data, user);
      toast.success('Lead created successfully!');
      setIsLeadModalOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
             <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
          <div>
             <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2">
              <Skeleton className="h-[300px] w-full rounded-xl" />
           </div>
           <div>
              <Skeleton className="h-[300px] w-full rounded-xl" />
           </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
         <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted transition-colors shadow-xs text-foreground disabled:opacity-60 active:scale-95 touch-manipulation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setIsLeadModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-xl font-semibold transition-all text-xs sm:text-sm shadow-xs active:scale-95 touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>
      </div>

      <AIDailyBriefing />

      {/* KPI Cards — responsive 2-col on mobile, 5-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="w-full">
          <StatCard title="Total Leads" value={stats.total.toString()} icon={Users} trend="up" trendValue="12%" subtitle="All time" />
        </div>
        <div className="w-full">
          <StatCard title="New Leads" value={stats.newLeads.toString()} icon={UserPlus} trend="up" trendValue="5%" subtitle="All time" />
        </div>
        <div className="w-full">
          <StatCard title="Admissions Done" value={stats.admissionsDone.toString()} icon={GraduationCap} trend="up" trendValue="2" subtitle="All time" />
        </div>
        <div className="w-full">
          <StatCard title="Revenue (MTD)" value={formatRevenue(stats.revenueMTD)} icon={IndianRupee} trend="up" trendValue="18%" subtitle="vs last month" />
        </div>
        <div className="col-span-2 sm:col-span-1 w-full">
          <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={Percent} trend="up" trendValue="1.2%" subtitle="All time" />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <RevenueChart />
        </div>
        <div>
           <LeadsSourceChart />
        </div>
      </div>

      {/* Charts Row 2 & Counselor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2">
            <AdmissionsByUniChart />
         </div>
         <div>
            <CounselorPerformance />
         </div>
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UpcomingTasks onNavigate={() => navigate('/tasks')} />
        <TodaysCalls />
        <RecentActivities onViewAll={() => navigate('/all-leads')} />
      </div>

      {/* Lead Creation Modal */}
      <LeadFormModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSubmit={handleCreateLead}
      />
    </div>
  );
}
