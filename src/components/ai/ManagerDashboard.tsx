import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, TrendingUp, AlertTriangle, CheckCircle2, Flame, Loader2, UserCog, PhoneCall, Filter } from 'lucide-react';
import { CounselorPerformance, AiManagerAlert } from '../../types/schema';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export function ManagerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<CounselorPerformance[]>([]);
  const [alerts, setAlerts] = useState<AiManagerAlert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch counselor performances (gracefully handle missing table)
      let perfData: any = null;
      try {
        const { data: pd, error: perfError } = await supabase
          .from('counselor_performance')
          .select(`*`)
          .eq('date', new Date().toISOString().split('T')[0])
          .order('score', { ascending: false });
        if (perfError) throw perfError;
        perfData = pd;
      } catch (perfErr) {
        // counselor_performance table may not exist yet
        console.debug('counselor_performance not available:', perfErr);
      }

      if (perfData) {
        setPerformances(perfData as unknown as (CounselorPerformance & { users: any })[]);
      }

      // Fetch Manager alerts (gracefully handle missing table)
      let alertData: any = null;
      try {
        const { data: ad, error: alertError } = await supabase
          .from('ai_manager_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(10);
        if (alertError) throw alertError;
        alertData = ad;
      } catch (alertErr) {
        console.debug('ai_manager_alerts not available:', alertErr);
      }

      if (alertData) {
        setAlerts(alertData as AiManagerAlert[]);
      }

    } catch (e) {
      console.error(e);
      // Fallback for mock data if table doesn't exist yet
      if (process.env.NODE_ENV === 'development') {
        toast.info("Showing mock data for Manager Dashboard (schema not applied yet)");
        setPerformances([
          {
            id: '1', counselorId: '123', date: '2026-08-25', score: 92, contactRatePercent: 88, conversionRatePercent: 18, avgResponseTimeMins: 15, aiStrengths: 'Fast response to hot leads.', aiImprovements: 'None', users: { name: 'Sarah Connor', email: 'sarah@edvix.com' }
          },
          {
            id: '2', counselorId: '124', date: '2026-08-25', score: 68, contactRatePercent: 60, conversionRatePercent: 8, avgResponseTimeMins: 120, aiStrengths: 'Good at closing.', aiImprovements: 'Needs to follow up faster.', users: { name: 'John Doe', email: 'john@edvix.com' }
          }
        ] as any);
        setAlerts([
          { id: '1', title: 'Performance Drop', description: 'John Doe is responding 45 mins slower than team average.', severity: 'High', isResolved: false } as any
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAlertResolved = async (id: string) => {
    try {
      await supabase.from('ai_manager_alerts').update({ is_resolved: true }).eq('id', id);
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success("Alert resolved");
    } catch (e) {
      toast.error("Failed to resolve alert");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manager Intelligence Dashboard</h1>
            <p className="text-muted-foreground">Team performance insights and AI coaching recommendations.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
            <Filter className="w-4 h-4" /> Filter by Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-primary mb-2"><Users className="w-5 h-5"/> <h3 className="font-medium">Active Counselors</h3></div>
          <p className="text-3xl font-bold">{performances.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500 mb-2"><TrendingUp className="w-5 h-5"/> <h3 className="font-medium">Avg Conversion Rate</h3></div>
          <p className="text-3xl font-bold">{performances.length ? Math.round(performances.reduce((acc, p) => acc + p.conversionRatePercent, 0) / performances.length) : 0}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-orange-500 mb-2"><PhoneCall className="w-5 h-5"/> <h3 className="font-medium">Avg Contact Rate</h3></div>
          <p className="text-3xl font-bold">{performances.length ? Math.round(performances.reduce((acc, p) => acc + p.contactRatePercent, 0) / performances.length) : 0}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 mb-2"><AlertTriangle className="w-5 h-5"/> <h3 className="font-medium">Active Alerts</h3></div>
          <p className="text-3xl font-bold">{alerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Team Performance Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Team Performance (Today)</h3>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Counselor</th>
                  <th className="px-4 py-3">AI Score</th>
                  <th className="px-4 py-3">Contact Rate</th>
                  <th className="px-4 py-3">Avg Resp Time</th>
                  <th className="px-4 py-3">AI Note</th>
                </tr>
              </thead>
              <tbody>
                {performances.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No data available for today.</td></tr>
                ) : performances.map((perf) => (
                  <tr key={perf.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {(perf as any).users?.name?.charAt(0) || 'C'}
                      </div>
                      {(perf as any).users?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${perf.score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : perf.score >= 60 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                        {perf.score}
                      </span>
                    </td>
                    <td className="px-4 py-4">{perf.contactRatePercent}%</td>
                    <td className="px-4 py-4">{perf.avgResponseTimeMins} mins</td>
                    <td className="px-4 py-4 max-w-[200px] truncate" title={perf.aiRecommendation || perf.aiImprovements}>
                      {perf.aiRecommendation || perf.aiImprovements || 'On track'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manager Alerts Queue */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold">AI Coaching Alerts</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active alerts.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="p-4 border border-border rounded-lg bg-background shadow-sm hover:border-red-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      {alert.severity === 'High' || alert.severity === 'Critical' ? <Flame className="w-4 h-4 text-red-500"/> : null}
                      {alert.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{alert.description}</p>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => markAlertResolved(alert.id)}
                      className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
