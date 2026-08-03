import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyticsKPIs {
  total_leads: number;
  today_leads: number;
  active_leads: number;
  qualified_leads: number;
  total_admissions: number;
  completed_admissions: number;
  pending_admissions: number;
  conversion_rate: number;
  revenue_this_month: number;
  total_revenue: number;
  pending_revenue: number;
  tasks_overdue: number;
  tasks_completed: number;
}

export interface FinanceAnalytics {
  total_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  pending_payments: number;
  failed_payments: number;
  pending_payouts: number;
  paid_payouts: number;
  total_commissions: number;
  pending_commissions: number;
  upi_count: number;
  bank_transfer_count: number;
  card_count: number;
  cash_count: number;
}

export interface TaskAnalytics {
  total_tasks: number;
  completed: number;
  pending: number;
  overdue: number;
  created_today: number;
  avg_completion_hours: number;
}

export interface StageCount { stage: string; count: number; }
export interface LeadSourceEntry { name: string; value: number; }
export interface UniversityPerformanceEntry { name: string; leads: number; admissions: number; revenue: number; }
export interface CoursePerformanceEntry { name: string; leads: number; admissions: number; avg_fee: number; }
export interface CounselorPerformanceEntry {
  counselor_id: string;
  name: string;
  assigned: number;
  contacted: number;
  converted: number;
  revenue: number;
  tasks_completed: number;
  tasks_overdue: number;
}
export interface ConversionFunnelEntry { name: string; value: number; }
export interface TrendEntry { name: string; leads: number; admissions: number; }
export interface MonthlyTrendEntry { name: string; leads: number; admissions: number; revenue: number; }
export interface DailyLeadEntry { name: string; leads: number; }
export interface LeadAgingEntry { bucket: string; count: number; }
export interface StateLeadEntry { name: string; value: number; }
export interface PaymentMethodEntry { name: string; value: number; amount: number; }

// ─── Cache layer ──────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; fetchedAt: number; }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isFresh<T>(entry: CacheEntry<T> | null): boolean {
  return !!entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

const cache: {
  kpis: CacheEntry<AnalyticsKPIs> | null;
  financeAnalytics: CacheEntry<FinanceAnalytics> | null;
  taskAnalytics: CacheEntry<TaskAnalytics> | null;
  pipeline: CacheEntry<StageCount[]> | null;
  leadSource: CacheEntry<LeadSourceEntry[]> | null;
  universityPerf: CacheEntry<UniversityPerformanceEntry[]> | null;
  coursePerf: CacheEntry<CoursePerformanceEntry[]> | null;
  counselorPerf: CacheEntry<CounselorPerformanceEntry[]> | null;
  funnel: CacheEntry<ConversionFunnelEntry[]> | null;
  trend: CacheEntry<TrendEntry[]> | null;
  monthlyTrend: CacheEntry<MonthlyTrendEntry[]> | null;
  dailyLeads: CacheEntry<DailyLeadEntry[]> | null;
  leadAging: CacheEntry<LeadAgingEntry[]> | null;
  leadsByState: CacheEntry<StateLeadEntry[]> | null;
  paymentMethods: CacheEntry<PaymentMethodEntry[]> | null;
} = {
  kpis: null, financeAnalytics: null, taskAnalytics: null,
  pipeline: null, leadSource: null, universityPerf: null, coursePerf: null,
  counselorPerf: null, funnel: null, trend: null, monthlyTrend: null,
  dailyLeads: null, leadAging: null, leadsByState: null, paymentMethods: null,
};

function invalidateCache() {
  (Object.keys(cache) as (keyof typeof cache)[]).forEach(k => { (cache as any)[k] = null; });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalytics(startDate?: Date, endDate?: Date) {
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(cache.kpis?.data ?? null);
  const [financeAnalytics, setFinance] = useState<FinanceAnalytics | null>(cache.financeAnalytics?.data ?? null);
  const [taskAnalytics, setTasks] = useState<TaskAnalytics | null>(cache.taskAnalytics?.data ?? null);
  const [admissionsPipeline, setPipeline] = useState<StageCount[]>(cache.pipeline?.data ?? []);
  const [leadSource, setLeadSource] = useState<LeadSourceEntry[]>(cache.leadSource?.data ?? []);
  const [universityPerformance, setUniversity] = useState<UniversityPerformanceEntry[]>(cache.universityPerf?.data ?? []);
  const [coursePerformance, setCourse] = useState<CoursePerformanceEntry[]>(cache.coursePerf?.data ?? []);
  const [counselorPerformance, setCounselor] = useState<CounselorPerformanceEntry[]>(cache.counselorPerf?.data ?? []);
  const [conversionFunnel, setFunnel] = useState<ConversionFunnelEntry[]>(cache.funnel?.data ?? []);
  const [trend, setTrend] = useState<TrendEntry[]>(cache.trend?.data ?? []);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendEntry[]>(cache.monthlyTrend?.data ?? []);
  const [dailyLeads, setDailyLeads] = useState<DailyLeadEntry[]>(cache.dailyLeads?.data ?? []);
  const [leadAging, setLeadAging] = useState<LeadAgingEntry[]>(cache.leadAging?.data ?? []);
  const [leadsByState, setLeadsByState] = useState<StateLeadEntry[]>(cache.leadsByState?.data ?? []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>(cache.paymentMethods?.data ?? []);
  const [isLoading, setIsLoading] = useState(!cache.kpis);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  const fetchAll = useCallback(async (force = false) => {
    const allFresh = !force &&
      isFresh(cache.kpis) && isFresh(cache.pipeline) && isFresh(cache.leadSource) &&
      isFresh(cache.universityPerf) && isFresh(cache.coursePerf) && isFresh(cache.counselorPerf) &&
      isFresh(cache.funnel) && isFresh(cache.trend) && isFresh(cache.monthlyTrend) &&
      isFresh(cache.dailyLeads) && isFresh(cache.financeAnalytics) && isFresh(cache.taskAnalytics) &&
      isFresh(cache.leadAging) && isFresh(cache.leadsByState) && isFresh(cache.paymentMethods);

    if (allFresh) {
      setKpis(cache.kpis!.data);
      setFinance(cache.financeAnalytics!.data);
      setTasks(cache.taskAnalytics!.data);
      setPipeline(cache.pipeline!.data);
      setLeadSource(cache.leadSource!.data);
      setUniversity(cache.universityPerf!.data);
      setCourse(cache.coursePerf!.data);
      setCounselor(cache.counselorPerf!.data);
      setFunnel(cache.funnel!.data);
      setTrend(cache.trend!.data);
      setMonthlyTrend(cache.monthlyTrend!.data);
      setDailyLeads(cache.dailyLeads!.data);
      setLeadAging(cache.leadAging!.data);
      setLeadsByState(cache.leadsByState!.data);
      setPaymentMethods(cache.paymentMethods!.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pStart = startDate ? startDate.toISOString().slice(0, 10) : undefined;
      const pEnd = endDate ? endDate.toISOString().slice(0, 10) : undefined;

      // Fire all RPCs in parallel — each is a single aggregated query on the server
      const [
        kpisRes, pipelineRes, sourceRes, univRes, courseRes,
        counselorRes, funnelRes, trendRes, monthlyRes,
        dailyRes, financeRes, taskRes, agingRes, stateRes, methodRes
      ] = await Promise.all([
        supabase.rpc('get_analytics_kpis', { p_start_date: pStart, p_end_date: pEnd }),
        supabase.rpc('get_admissions_pipeline'),
        supabase.rpc('get_lead_source_breakdown'),
        supabase.rpc('get_university_performance'),
        supabase.rpc('get_course_performance'),
        supabase.rpc('get_counselor_performance'),
        supabase.rpc('get_conversion_funnel'),
        supabase.rpc('get_weekly_trend'),
        supabase.rpc('get_monthly_trend'),
        supabase.rpc('get_daily_leads_trend'),
        supabase.rpc('get_finance_analytics'),
        supabase.rpc('get_task_analytics'),
        supabase.rpc('get_lead_aging_report'),
        supabase.rpc('get_leads_by_state'),
        supabase.rpc('get_payment_method_distribution'),
      ]);

      if (!isMounted.current) return;
      if (kpisRes.error) throw kpisRes.error;

      // KPIs
      const kpisData = kpisRes.data as AnalyticsKPIs;
      cache.kpis = { data: kpisData, fetchedAt: Date.now() };
      setKpis(kpisData);

      // Finance
      if (!financeRes.error && financeRes.data) {
        const fd = financeRes.data as FinanceAnalytics;
        cache.financeAnalytics = { data: fd, fetchedAt: Date.now() };
        setFinance(fd);
      }

      // Tasks
      if (!taskRes.error && taskRes.data) {
        const td = taskRes.data as TaskAnalytics;
        cache.taskAnalytics = { data: td, fetchedAt: Date.now() };
        setTasks(td);
      }

      // Pipeline
      if (!pipelineRes.error && pipelineRes.data) {
        const pl = (pipelineRes.data as any[]).map(r => ({ stage: r.stage as string, count: Number(r.count) }));
        cache.pipeline = { data: pl, fetchedAt: Date.now() };
        setPipeline(pl);
      }

      // Lead source
      if (!sourceRes.error && sourceRes.data) {
        const src = (sourceRes.data as any[]).map(r => ({ name: r.name as string, value: Number(r.value) }));
        cache.leadSource = { data: src, fetchedAt: Date.now() };
        setLeadSource(src);
      }

      // University performance
      if (!univRes.error && univRes.data) {
        const univ = (univRes.data as any[]).map(r => ({
          name: r.name as string, leads: Number(r.leads),
          admissions: Number(r.admissions), revenue: Number(r.revenue)
        }));
        cache.universityPerf = { data: univ, fetchedAt: Date.now() };
        setUniversity(univ);
      }

      // Course performance
      if (!courseRes.error && courseRes.data) {
        const courses = (courseRes.data as any[]).map(r => ({
          name: r.name as string, leads: Number(r.leads),
          admissions: Number(r.admissions), avg_fee: Number(r.avg_fee)
        }));
        cache.coursePerf = { data: courses, fetchedAt: Date.now() };
        setCourse(courses);
      }

      // Counselor performance
      if (!counselorRes.error && counselorRes.data) {
        const counselors = (counselorRes.data as any[]).map(r => ({
          counselor_id: r.counselor_id as string,
          name: r.name as string,
          assigned: Number(r.assigned),
          contacted: Number(r.contacted),
          converted: Number(r.converted),
          revenue: Number(r.revenue),
          tasks_completed: Number(r.tasks_completed),
          tasks_overdue: Number(r.tasks_overdue),
        }));
        cache.counselorPerf = { data: counselors, fetchedAt: Date.now() };
        setCounselor(counselors);
      }

      // Conversion funnel
      if (!funnelRes.error && funnelRes.data) {
        const funnel = (funnelRes.data as any[]).map(r => ({ name: r.name as string, value: Number(r.value) }));
        cache.funnel = { data: funnel, fetchedAt: Date.now() };
        setFunnel(funnel);
      }

      // Weekly trend
      if (!trendRes.error && trendRes.data) {
        const wt = (trendRes.data as any[]).map(r => ({ name: r.name as string, leads: Number(r.leads), admissions: Number(r.admissions) }));
        cache.trend = { data: wt, fetchedAt: Date.now() };
        setTrend(wt);
      }

      // Monthly trend
      if (!monthlyRes.error && monthlyRes.data) {
        const mt = (monthlyRes.data as any[]).map(r => ({
          name: r.name as string, leads: Number(r.leads),
          admissions: Number(r.admissions), revenue: Number(r.revenue)
        }));
        cache.monthlyTrend = { data: mt, fetchedAt: Date.now() };
        setMonthlyTrend(mt);
      }

      // Daily leads
      if (!dailyRes.error && dailyRes.data) {
        const dl = (dailyRes.data as any[]).map(r => ({ name: r.name as string, leads: Number(r.leads) }));
        cache.dailyLeads = { data: dl, fetchedAt: Date.now() };
        setDailyLeads(dl);
      }

      // Lead aging
      if (!agingRes.error && agingRes.data) {
        const ag = (agingRes.data as any[]).map(r => ({ bucket: r.bucket as string, count: Number(r.count) }));
        cache.leadAging = { data: ag, fetchedAt: Date.now() };
        setLeadAging(ag);
      }

      // Leads by state
      if (!stateRes.error && stateRes.data) {
        const st = (stateRes.data as any[]).map(r => ({ name: r.name as string, value: Number(r.value) }));
        cache.leadsByState = { data: st, fetchedAt: Date.now() };
        setLeadsByState(st);
      }

      // Payment methods
      if (!methodRes.error && methodRes.data) {
        const pm = (methodRes.data as any[]).map(r => ({
          name: r.name as string, value: Number(r.value), amount: Number(r.amount)
        }));
        cache.paymentMethods = { data: pm, fetchedAt: Date.now() };
        setPaymentMethods(pm);
      }

    } catch (err: any) {
      console.error('[useAnalytics] fetch error:', err);
      if (isMounted.current) setError(err.message || 'Failed to load analytics');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [startDate, endDate]);

  // ── Initial fetch + real-time invalidation ───────────────────────────────

  useEffect(() => {
    isMounted.current = true;
    fetchAll();

    const handleChange = () => { invalidateCache(); fetchAll(true); };

    const leadsChannel = supabase.channel('analytics-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, handleChange)
      .subscribe();

    const admissionsChannel = supabase.channel('analytics-admissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admissions' }, handleChange)
      .subscribe();

    const paymentsChannel = supabase.channel('analytics-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, handleChange)
      .subscribe();

    const tasksChannel = supabase.channel('analytics-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handleChange)
      .subscribe();

    return () => {
      isMounted.current = false;
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(admissionsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [fetchAll]);

  // ── Derived filter helpers ────────────────────────────────────────────────

  const counselorNames = useMemo(() => counselorPerformance.map(c => c.name), [counselorPerformance]);
  const universityNames = useMemo(() => universityPerformance.map(u => u.name), [universityPerformance]);
  const courseNames = useMemo(() => coursePerformance.map(c => c.name), [coursePerformance]);

  // ── Export data ───────────────────────────────────────────────────────────

  const exportData = useMemo(() => ({
    kpis: kpis ? {
      'Total Leads': kpis.total_leads,
      "Today's Leads": kpis.today_leads,
      'Active Leads': kpis.active_leads,
      'Qualified Leads': kpis.qualified_leads,
      'Total Admissions': kpis.total_admissions,
      'Completed Admissions': kpis.completed_admissions,
      'Conversion Rate (%)': kpis.conversion_rate,
      'Revenue This Month': kpis.revenue_this_month,
      'Total Revenue': kpis.total_revenue,
      'Pending Revenue': kpis.pending_revenue,
    } : {},
    leadSource,
    universityPerformance,
    counselorPerformance,
    coursePerformance,
    monthlyTrend,
  }), [kpis, leadSource, universityPerformance, counselorPerformance, coursePerformance, monthlyTrend]);

  return {
    isLoading,
    error,
    // KPI blocks
    kpis,
    financeAnalytics,
    taskAnalytics,
    // Chart data
    admissionsPipeline,
    leadSource,
    universityPerformance,
    coursePerformance,
    counselorPerformance,
    conversionFunnel,
    trend,
    monthlyTrend,
    dailyLeads,
    leadAging,
    leadsByState,
    paymentMethods,
    // Helpers
    exportData,
    counselorNames,
    universityNames,
    courseNames,
    refresh: () => { invalidateCache(); fetchAll(true); },
  };
}
