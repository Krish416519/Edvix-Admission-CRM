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
import { useLeads } from '../../hooks/useLeads';

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
      const [totalRes, newRes, admRes, revenueRes] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('lead_status', 'New'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('lead_status', 'Admission Done'),
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

    // Also poll every 15s as a safety net for bulk imports
    const interval = setInterval(fetchStats, 15000);

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
  const { addLead } = useLeads();
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
      await addLead(data);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors shadow-sm text-foreground disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setIsLeadModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      <AIDailyBriefing />

      {/* KPI Cards — powered by server-side COUNT queries. Horizontally scrollable on mobile */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-[85vw] sm:w-auto shrink-0 snap-center">
          <StatCard title="Total Leads" value={stats.total.toString()} icon={Users} trend="up" trendValue="12%" subtitle="All time" />
        </div>
        <div className="w-[85vw] sm:w-auto shrink-0 snap-center">
          <StatCard title="New Leads" value={stats.newLeads.toString()} icon={UserPlus} trend="up" trendValue="5%" subtitle="All time" />
        </div>
        <div className="w-[85vw] sm:w-auto shrink-0 snap-center">
          <StatCard title="Admissions Done" value={stats.admissionsDone.toString()} icon={GraduationCap} trend="up" trendValue="2" subtitle="All time" />
        </div>
        <div className="w-[85vw] sm:w-auto shrink-0 snap-center">
          <StatCard title="Revenue (MTD)" value={formatRevenue(stats.revenueMTD)} icon={IndianRupee} trend="up" trendValue="18%" subtitle="vs last month" />
        </div>
        <div className="w-[85vw] sm:w-auto shrink-0 snap-center">
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
        <RecentActivities onViewAll={() => navigate('/leads')} />
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
