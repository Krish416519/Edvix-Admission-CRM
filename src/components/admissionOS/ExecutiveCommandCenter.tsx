import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain, IndianRupee, GraduationCap, FileText, TrendingUp,
  AlertTriangle, Users, Building2, RefreshCw, Radio,
  ShieldCheck, ChevronRight, ArrowUpRight, Clock,
  Calendar, Layers, Sparkles, HelpCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { BusinessIntelligence } from '../../lib/ai/BusinessIntelligence';
import { AdmissionOS } from '../../lib/ai/AdmissionOS';
import { DailyMissions } from './DailyMissions';
import { RiskAlerts } from './RiskAlerts';
import { FinancialDrillDownModal } from './FinancialDrillDownModal';
import {
  DateRangeKey, FinancialMetrics, FinancialDrillDownRecord,
  StageVelocity, LeaderboardItem
} from '../../types/commandCenter';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UserPerformanceMatrix } from './UserPerformanceMatrix';

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: '7 Days' },
  { key: 'last30days', label: '30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export function ExecutiveCommandCenter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'performance' ? 'performance' : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>(initialTab);
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>('thisMonth');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Financial Data
  const [finance, setFinance] = useState<FinancialMetrics>({
    revenueToday: 0,
    revenuePeriod: 0,
    expectedAdmissionRevenue: 0,
    pipelineOpportunity: 0,
    expectedRevenue: 0,
    pendingCollections: 0,
    collectionRate: 0,
    revenueAtRisk: 0,
    currency: 'INR',
    periodLabel: 'This Month',
  });

  // Section-level Error States for Graceful Resilience
  const [financeError, setFinanceError] = useState(false);
  const [pipelineError, setPipelineError] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(false);

  // Admission & Pipeline Data
  const [admissions, setAdmissions] = useState({
    admissionsToday: 0,
    conversionRate: 0,
    pendingDocuments: 0,
    totalCompleted: 0,
  });

  const [pipelineSummary, setPipelineSummary] = useState({
    totalStudents: 0,
    criticalAlerts: 0,
    highRiskCount: 0,
    avgAdmissionProbability: 0,
    stages: [] as StageVelocity[],
  });

  // Leaderboards
  const [topUnis, setTopUnis] = useState<LeaderboardItem[]>([]);
  const [topCounselors, setTopCounselors] = useState<LeaderboardItem[]>([]);

  // Drill-down Modal State
  const [drillModal, setDrillModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    totalAmount: number;
    records: FinancialDrillDownRecord[];
    loading: boolean;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    totalAmount: 0,
    records: [],
    loading: false,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Currency Formatter
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // Core Data Fetcher with Section-Level Resilience
  const loadDashboardData = useCallback(async (isSilentRefresh: boolean = false) => {
    if (!isSilentRefresh) setLoading(true);
    else setRefreshing(true);

    // 1. Fetch Financial Metrics (Isolated)
    try {
      setFinanceError(false);
      const finData = await BusinessIntelligence.getRevenueMetrics(selectedRange);
      setFinance(finData);
    } catch (e) {
      console.error('Failed to load financial metrics:', e);
      setFinanceError(true);
    }

    // 2. Fetch Admissions Metrics (Isolated)
    try {
      setPipelineError(false);
      const admData = await BusinessIntelligence.getAdmissionMetrics();
      setAdmissions(admData);
    } catch (e) {
      console.error('Failed to load admission metrics:', e);
      setPipelineError(true);
    }

    // 3. Fetch Pipeline & Velocity Summary (Isolated)
    try {
      const summary = await AdmissionOS.getExecutiveSummary();
      setPipelineSummary({
        totalStudents: summary.totalStudents,
        criticalAlerts: summary.criticalAlerts,
        highRiskCount: summary.highRiskCount,
        avgAdmissionProbability: summary.avgAdmissionProbability,
        stages: summary.stages || [],
      });
    } catch (e) {
      console.error('Failed to load pipeline summary:', e);
      setPipelineError(true);
    }

    // 4. Fetch Leaderboards (Isolated)
    try {
      setLeaderboardError(false);
      const [unis, counselors] = await Promise.all([
        BusinessIntelligence.getTopUniversities(5),
        BusinessIntelligence.getTopCounselors(5),
      ]);
      setTopUnis(unis);
      setTopCounselors(counselors);
    } catch (e) {
      console.error('Failed to load leaderboards:', e);
      setLeaderboardError(true);
    }

    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLoading(false);
    setRefreshing(false);
  }, [selectedRange]);

  // Initial load & Date Range dependency
  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  // Realtime Integration: Debounced subscription to authoritative tables
  useEffect(() => {
    const handleRealtimeChange = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        loadDashboardData(true);
      }, 1500);
    };

    const channel = supabase
      .channel('command-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, handleRealtimeChange)
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  // Handle Financial Drill-Down Clicks
  const openFinancialDrillDown = async (
    type: 'today' | 'period' | 'pending' | 'expected' | 'atRisk' | 'pipeline',
    title: string,
    subtitle: string,
    totalAmount: number
  ) => {
    setDrillModal({
      isOpen: true,
      title,
      subtitle,
      totalAmount,
      records: [],
      loading: true,
    });

    try {
      const records = await BusinessIntelligence.getFinancialDrillDown(type, selectedRange);
      setDrillModal(prev => ({
        ...prev,
        records,
        loading: false,
      }));
    } catch (err) {
      console.error('Failed to retrieve financial drill-down records:', err);
      setDrillModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6 animate-in fade-in duration-300">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 text-primary-foreground flex items-center justify-center mx-auto shadow-lg shadow-primary/20 animate-pulse">
            <Brain className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Initializing Command Center</h2>
            <p className="text-xs text-muted-foreground">Aggregating live intelligence across leads, admissions, finance, and tasks...</p>
          </div>
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-primary animate-pulse w-2/3 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-300 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* SECTION 1: EXECUTIVE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 via-primary to-purple-600 rounded-2xl flex shrink-0 items-center justify-center text-white shadow-md shadow-primary/10">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Executive Command Center</h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Synced
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live intelligence across leads, admissions, payments, tasks and documents.
            </p>
          </div>
        </div>

        {/* Controls: Date Picker & Refresh */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-start">
          {/* Segmented Date Range Selector */}
          <div className="inline-flex items-center p-1 bg-muted/60 border border-border rounded-xl text-xs overflow-x-auto hide-scrollbar flex-nowrap max-w-full touch-manipulation">
            {DATE_RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSelectedRange(opt.key)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap touch-manipulation",
                  selectedRange === opt.key
                    ? "bg-background text-foreground shadow-sm font-semibold border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="h-9 px-3 border border-border bg-card hover:bg-muted/50 rounded-xl text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors shrink-0 shadow-sm touch-manipulation"
            title="Refresh live metrics"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground shrink-0 hidden md:inline">
              Refreshed {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => {
            setActiveTab('overview');
            setSearchParams({});
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 touch-manipulation",
            activeTab === 'overview'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Brain className="w-4 h-4" />
          <span>Executive Intelligence</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('performance');
            setSearchParams({ tab: 'performance' });
          }}
          className={cn(
            "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 touch-manipulation",
            activeTab === 'performance'
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Users className="w-4 h-4" />
          <span>User & Team Performance Matrix</span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </button>
      </div>

      {activeTab === 'performance' ? (
        <UserPerformanceMatrix />
      ) : (
        <>
          {/* SECTION 2: FINANCIAL INTELLIGENCE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Financial Intelligence</h2>
              </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>Collection Efficiency:</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold",
              finance.collectionRate >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
              finance.collectionRate >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
              "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            )}>
              {finance.collectionRate}%
            </span>
          </div>
        </div>

        {financeError ? (
          <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-900 dark:text-red-200">Financial Ledger Data Temporarily Unavailable</p>
                <p className="text-xs text-red-700 dark:text-red-400">Could not retrieve live payment transactions from Supabase. The remainder of the Command Center remains active.</p>
              </div>
            </div>
            <button
              onClick={() => loadDashboardData(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0 shadow-sm"
            >
              Retry Financial Sync
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
            <InteractiveKpiCard
              icon={IndianRupee}
              color="emerald"
              label="Revenue Today"
              value={fmt(finance.revenueToday)}
              subtext="Canonical IST receipts"
              onClick={() => openFinancialDrillDown('today', 'Revenue Today', "Today's verified and paid fee transactions", finance.revenueToday)}
            />
            <InteractiveKpiCard
              icon={IndianRupee}
              color="blue"
              label={`Revenue (${finance.periodLabel})`}
              value={fmt(finance.revenuePeriod)}
              subtext="Period-to-date collections"
              onClick={() => openFinancialDrillDown('period', `Revenue (${finance.periodLabel})`, `Verified paid fees for ${finance.periodLabel}`, finance.revenuePeriod)}
            />
            <InteractiveKpiCard
              icon={GraduationCap}
              color="indigo"
              label="Expected Admissions"
              value={fmt(finance.expectedAdmissionRevenue)}
              subtext="Confirmed enrollment fees"
              onClick={() => openFinancialDrillDown('expected', 'Expected Admission Revenue', 'Fee structures on confirmed active admissions', finance.expectedAdmissionRevenue)}
            />
            <InteractiveKpiCard
              icon={Sparkles}
              color="purple"
              label="Pipeline Opportunity"
              value={fmt(finance.pipelineOpportunity)}
              subtext="Qualified student budgets"
              onClick={() => openFinancialDrillDown('pipeline', 'Pipeline Opportunity', 'Projected pipeline value from qualified and hot prospective leads', finance.pipelineOpportunity)}
            />
            <InteractiveKpiCard
              icon={Clock}
              color="amber"
              label="Pending Collections"
              value={fmt(finance.pendingCollections)}
              subtext="Awaiting student payment"
              onClick={() => openFinancialDrillDown('pending', 'Pending Collections', 'Outstanding student fee payments awaiting collection or verification', finance.pendingCollections)}
            />
            <InteractiveKpiCard
              icon={AlertTriangle}
              color="red"
              label="Revenue At Risk"
              value={fmt(finance.revenueAtRisk)}
              subtext="Pending past 7-day SLA"
              onClick={() => openFinancialDrillDown('atRisk', 'Revenue At Risk', 'Delinquent fee installments and at-risk admission files', finance.revenueAtRisk)}
            />
          </div>
        )}
      </div>

      {/* SECTION 3: PIPELINE INTELLIGENCE & VELOCITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pipeline Health & Stage Velocity</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {pipelineSummary.totalStudents} total active student files
          </span>
        </div>

        {/* Topline Pipeline KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <InteractiveKpiCard
            icon={GraduationCap}
            color="indigo"
            label="Admissions Today"
            value={String(admissions.admissionsToday)}
            subtext="New enrollments registered"
            onClick={() => navigate('/all-leads?status=Admitted')}
          />
          <InteractiveKpiCard
            icon={TrendingUp}
            color="emerald"
            label="Conversion Rate"
            value={`${admissions.conversionRate}%`}
            subtext="Enrolled / Total active leads"
            onClick={() => navigate('/smart-view')}
          />
          <InteractiveKpiCard
            icon={FileText}
            color="amber"
            label="Pending Documents"
            value={String(admissions.pendingDocuments)}
            subtext="Awaiting registrar verification"
            onClick={() => navigate('/all-leads?status=' + encodeURIComponent('Docs Pending'))}
          />
          <InteractiveKpiCard
            icon={AlertTriangle}
            color="red"
            label="Critical Risk Alerts"
            value={String(pipelineSummary.criticalAlerts)}
            subtext="Students exceeding SLA"
            onClick={() => {
              const el = document.getElementById('risk-radar-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>

        {/* Unified 14-Stage Velocity Matrix */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Funnel Stage Distribution & SLA Waiting Time</h3>
              <p className="text-xs text-muted-foreground">Average hours students remain in each lifecycle stage. Amber tags highlight bottlenecks exceeding SLA.</p>
            </div>
            <button
              onClick={() => navigate('/smart-view')}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 self-start"
            >
              Open Live Pipeline <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pipelineSummary.stages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No active students in pipeline.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
              {pipelineSummary.stages.map(s => {
                const isOverdue = s.isBottleneck;
                const hoursLabel = s.avgWaitingHours > 24 
                  ? `${(s.avgWaitingHours / 24).toFixed(1)}d avg` 
                  : `${s.avgWaitingHours}h avg`;

                return (
                  <div
                    key={s.stage}
                    onClick={() => navigate('/all-leads?status=' + encodeURIComponent(s.stage))}
                    className={cn(
                      "p-2.5 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 sm:space-y-2 group hover:shadow-md touch-manipulation",
                      isOverdue
                        ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500"
                        : "bg-muted/20 border-border hover:border-primary/40"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors">
                          {s.count}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {s.percentage}%
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-foreground truncate mt-0.5" title={s.stage}>
                        {s.stage}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Waiting:</span>
                        <span className="font-semibold">{hoursLabel}</span>
                      </div>
                      {isOverdue && (
                        <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded text-center">
                          {s.overdueCount} Over SLA
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: ACTION HUB (3 COLUMNS: MISSIONS + RISKS + LEADERBOARDS) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Execution & Oversight Hub</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Today's AI Operational Missions */}
          <div className="lg:col-span-1 h-full">
            <DailyMissions />
          </div>

          {/* Column 2: Deterministic Risk Radar */}
          <div id="risk-radar-section" className="lg:col-span-1 h-full">
            <RiskAlerts />
          </div>

          {/* Column 3: Leaderboards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Top Universities Leaderboard */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Top Universities</h3>
                      <p className="text-[11px] text-muted-foreground">Ranked by application volume</p>
                    </div>
                  </div>
                </div>

                {topUnis.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No university applications registered yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {topUnis.map((uni, i) => (
                      <div key={uni.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-foreground truncate">{uni.name}</p>
                            {uni.subText && <p className="text-[11px] text-muted-foreground">{uni.subText}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full shrink-0">
                          {uni.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Counselors Leaderboard */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Top Counselors</h3>
                      <p className="text-[11px] text-muted-foreground">Active student engagements</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('performance');
                      setSearchParams({ tab: 'performance' });
                    }}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Team Matrix <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {topCounselors.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No counselor assignments recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {topCounselors.map((c, i) => (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/all-leads?counselor=${c.id}`)}
                        className="py-2.5 px-2 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                        title={`View leads assigned to ${c.name}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {c.avatarText || c.name.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                            {c.subText && <p className="text-[11px] text-muted-foreground">{c.subText}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full shrink-0">
                          {c.count} leads
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )}


      {/* Drill-Down Modal */}
      <FinancialDrillDownModal
        isOpen={drillModal.isOpen}
        onClose={() => setDrillModal(prev => ({ ...prev, isOpen: false }))}
        title={drillModal.title}
        subtitle={drillModal.subtitle}
        totalAmount={drillModal.totalAmount}
        records={drillModal.records}
        loading={drillModal.loading}
      />
    </div>
  );
}

interface InteractiveKpiCardProps {
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'indigo' | 'red';
  label: string;
  value: string;
  subtext?: string;
  onClick?: () => void;
}

function InteractiveKpiCard({ icon: Icon, color, label, value, subtext, onClick }: InteractiveKpiCardProps) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-2xl p-3.5 sm:p-5 shadow-sm transition-all flex flex-col justify-between space-y-2 sm:space-y-3 group touch-manipulation",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate pr-1">{label}</span>
        <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", colorMap[color])}>
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>

      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <h3 className="text-base sm:text-2xl font-bold tracking-tight text-foreground truncate" title={value}>{value}</h3>
        {subtext && (
          <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center justify-between truncate">
            <span className="truncate">{subtext}</span>
            {onClick && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ml-1 hidden sm:inline" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
