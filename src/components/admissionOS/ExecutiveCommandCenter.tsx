import { useState, useEffect } from 'react';
import {
  Brain, IndianRupee, GraduationCap, FileText, TrendingUp,
  AlertTriangle, Users, Building2, Loader2, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { BusinessIntelligence } from '../../lib/ai/BusinessIntelligence';
import { AdmissionOS } from '../../lib/ai/AdmissionOS';
import { DailyMissions } from './DailyMissions';
import { RiskAlerts } from './RiskAlerts';

export function ExecutiveCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState({ revenueToday: 0, revenueMonth: 0, revenuePending: 0, expectedRevenue: 0 });
  const [admissions, setAdmissions] = useState({ admissionsToday: 0, conversionRate: 0, pendingDocuments: 0, totalCompleted: 0 });
  const [topUnis, setTopUnis] = useState<any[]>([]);
  const [topCounselors, setTopCounselors] = useState<any[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState({ totalStudents: 0, criticalAlerts: 0, highRiskCount: 0, expectedRevenue: 0, avgAdmissionProbability: 0, stageDistribution: {} as Record<string, number> });

  useEffect(() => {
    const load = async () => {
      try {
        const [rev, adm, unis, counselors, summary] = await Promise.all([
          BusinessIntelligence.getRevenueMetrics(),
          BusinessIntelligence.getAdmissionMetrics(),
          BusinessIntelligence.getTopUniversities(),
          BusinessIntelligence.getTopCounselors(),
          AdmissionOS.getExecutiveSummary(),
        ]);
        setRevenue(rev);
        setAdmissions(adm);
        setTopUnis(unis);
        setTopCounselors(counselors);
        setPipelineSummary(summary);
      } catch (e) {
        console.error('Failed to load executive data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Brain className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg font-semibold">Loading Executive Command Center...</p>
          <p className="text-sm text-muted-foreground mt-1">Aggregating live data from all CRM modules</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Command Center</h1>
          <p className="text-sm text-muted-foreground">Live intelligence from every CRM module</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 hide-scrollbar space-y-6">
        {/* KPI Row 1: Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={IndianRupee} color="emerald" label="Revenue Today" value={fmt(revenue.revenueToday)} />
          <KpiCard icon={IndianRupee} color="blue" label="Revenue This Month" value={fmt(revenue.revenueMonth)} />
          <KpiCard icon={IndianRupee} color="purple" label="Expected Revenue" value={fmt(revenue.expectedRevenue)} />
          <KpiCard icon={IndianRupee} color="amber" label="Pending Payments" value={fmt(revenue.revenuePending)} />
        </div>

        {/* KPI Row 2: Admissions & Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={GraduationCap} color="indigo" label="Admissions Today" value={String(admissions.admissionsToday)} />
          <KpiCard icon={TrendingUp} color="emerald" label="Conversion Rate" value={`${admissions.conversionRate}%`} />
          <KpiCard icon={FileText} color="amber" label="Pending Documents" value={String(admissions.pendingDocuments)} />
          <KpiCard icon={AlertTriangle} color="red" label="Critical Alerts" value={String(pipelineSummary.criticalAlerts)} />
        </div>

        {/* Main Grid: Missions + Risks + Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Missions */}
          <div className="lg:col-span-1">
            <DailyMissions />
          </div>

          {/* Risk Alerts */}
          <div className="lg:col-span-1">
            <RiskAlerts />
          </div>

          {/* Top Lists */}
          <div className="space-y-4">
            {/* Top Universities */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-primary" /> Top Universities
              </h3>
              {topUnis.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No admission data yet</p>
              ) : (
                <div className="space-y-3">
                  {topUnis.map((uni, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm font-medium truncate">{uni.name}</span>
                      </div>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{uni.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Counselors */}
            <div className="bg-card border border-border rounded-xl shadow-sm p-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" /> Top Counselors
              </h3>
              {topCounselors.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No admission data yet</p>
              ) : (
                <div className="space-y-3">
                  {topCounselors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {c.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium truncate">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Stage Distribution */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" /> Pipeline Distribution ({pipelineSummary.totalStudents} students)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(pipelineSummary.stageDistribution).map(([stage, count]) => (
              <div key={stage} className="bg-muted/30 border border-border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-[10px] text-muted-foreground font-medium mt-1 leading-tight">{stage}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-foreground">{value}</h2>
    </div>
  );
}
