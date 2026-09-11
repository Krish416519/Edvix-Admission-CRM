import React, { useState, useRef, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, AreaChart, Area
} from 'recharts';
import { 
  Download, Users, GraduationCap, FileText, TrendingUp, IndianRupee, 
  RefreshCw, AlertCircle, Sparkles, MapPin, Clock, CreditCard, 
  Search, ArrowUpDown, ChevronDown, Check, X, PhoneCall, ShieldCheck,
  Building2, BookOpen, UserCheck, Award
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Skeleton } from '../ui/Skeleton';
import { AIRecommendationAnalytics } from './AIRecommendationAnalytics';
import { DispositionAnalytics } from './DispositionAnalytics';
import { cn } from '../../lib/utils';
import { 
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, subMonths, startOfYear, format 
} from 'date-fns';

const VIBRANT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#3b82f6', '#14b8a6', '#f43f5e'];

type DatePreset = 'Today' | 'Yesterday' | 'Last 7 Days' | 'This Month' | 'Last Month' | 'This Quarter' | 'This Year' | 'All Time';
type TrendViewMode = 'weekly' | 'monthly' | 'daily';

export function AnalyticsDashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>('This Month');
  const [selectedCounselor, setSelectedCounselor] = useState('All');
  const [selectedUniversity, setSelectedUniversity] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [trendMode, setTrendMode] = useState<TrendViewMode>('weekly');
  const [counselorSearch, setCounselorSearch] = useState('');
  const [counselorSortField, setCounselorSortField] = useState<'assigned' | 'converted' | 'winRate' | 'revenue'>('converted');
  const [counselorSortAsc, setCounselorSortAsc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<'general' | 'ai' | 'dispositions'>('general');

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Compute exact Date bounds for selected preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'Today':
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case 'Yesterday': {
        const y = subDays(now, 1);
        return { startDate: startOfDay(y), endDate: endOfDay(y) };
      }
      case 'Last 7 Days':
        return { startDate: subDays(now, 7), endDate: now };
      case 'This Month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'Last Month': {
        const lm = subMonths(now, 1);
        return { startDate: startOfMonth(lm), endDate: endOfMonth(lm) };
      }
      case 'This Quarter': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const qStart = new Date(now.getFullYear(), qMonth, 1);
        return { startDate: qStart, endDate: now };
      }
      case 'This Year':
        return { startDate: startOfYear(now), endDate: now };
      case 'All Time':
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [datePreset]);

  // Hook into live analytics engine with real date parameters
  const {
    isLoading,
    error,
    kpis,
    financeAnalytics,
    taskAnalytics,
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
    exportData,
    counselorNames,
    universityNames,
    courseNames,
    refresh,
  } = useAnalytics(startDate, endDate);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);

  // Unique lead sources for filtering
  const sourceNames = useMemo(() => {
    return Array.from(new Set(leadSource.map(s => s.name).filter(Boolean)));
  }, [leadSource]);

  // ── Filters & Search ───────────────────────────────────────────────────────
  const hasActiveFilters = selectedCounselor !== 'All' || selectedUniversity !== 'All' || selectedCourse !== 'All' || selectedSource !== 'All' || datePreset !== 'This Month';

  const resetFilters = () => {
    setSelectedCounselor('All');
    setSelectedUniversity('All');
    setSelectedCourse('All');
    setSelectedSource('All');
    setDatePreset('This Month');
    setCounselorSearch('');
  };

  const filteredUniversityPerformance = useMemo(() => {
    if (selectedUniversity === 'All') return universityPerformance;
    return universityPerformance.filter(u => u.name === selectedUniversity);
  }, [universityPerformance, selectedUniversity]);

  const filteredCoursePerformance = useMemo(() => {
    if (selectedCourse === 'All') return coursePerformance;
    return coursePerformance.filter(c => c.name === selectedCourse);
  }, [coursePerformance, selectedCourse]);

  const filteredCounselorPerformance = useMemo(() => {
    let list = counselorPerformance;
    if (selectedCounselor !== 'All') {
      list = list.filter(c => c.name === selectedCounselor);
    }
    if (counselorSearch.trim()) {
      const q = counselorSearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    // Sort list
    return [...list].sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (counselorSortField === 'assigned') {
        valA = a.assigned;
        valB = b.assigned;
      } else if (counselorSortField === 'converted') {
        valA = a.converted;
        valB = b.converted;
      } else if (counselorSortField === 'winRate') {
        valA = a.assigned > 0 ? (a.converted / a.assigned) * 100 : 0;
        valB = b.assigned > 0 ? (b.converted / b.assigned) * 100 : 0;
      } else if (counselorSortField === 'revenue') {
        valA = a.revenue;
        valB = b.revenue;
      }
      return counselorSortAsc ? valA - valB : valB - valA;
    });
  }, [counselorPerformance, selectedCounselor, counselorSearch, counselorSortField, counselorSortAsc]);

  // Determine top performer
  const topPerformerId = useMemo(() => {
    if (counselorPerformance.length === 0) return null;
    const sorted = [...counselorPerformance].sort((a, b) => b.converted - a.converted);
    return sorted[0]?.counselor_id;
  }, [counselorPerformance]);

  // ── Export Handlers ────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const imgHeight = (img.height * imgWidth) / img.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`edvix-analytics-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF executive report exported successfully');
    } catch {
      toast.error('Failed to export PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Executive Summary / KPIs
    const wsKpis = XLSX.utils.json_to_sheet([exportData.kpis]);
    XLSX.utils.book_append_sheet(wb, wsKpis, 'Executive_KPIs');

    // 2. Conversion Funnel
    const wsFunnel = XLSX.utils.json_to_sheet(conversionFunnel);
    XLSX.utils.book_append_sheet(wb, wsFunnel, 'Pipeline_Funnel');

    // 3. Counselor Team Matrix
    const wsCounselors = XLSX.utils.json_to_sheet(counselorPerformance.map(c => ({
      Counselor: c.name,
      Assigned: c.assigned,
      Contacted: c.contacted,
      Converted: c.converted,
      'Win Rate (%)': c.assigned > 0 ? Math.round((c.converted / c.assigned) * 100) : 0,
      Revenue: c.revenue,
      'Tasks Completed': c.tasks_completed,
      'Tasks Overdue': c.tasks_overdue
    })));
    XLSX.utils.book_append_sheet(wb, wsCounselors, 'Counselor_Matrix');

    // 4. Lead Sources
    const wsSources = XLSX.utils.json_to_sheet(exportData.leadSource);
    XLSX.utils.book_append_sheet(wb, wsSources, 'Lead_Sources');

    // 5. Universities
    const wsUniv = XLSX.utils.json_to_sheet(exportData.universityPerformance);
    XLSX.utils.book_append_sheet(wb, wsUniv, 'Universities');

    // 6. Courses
    const wsCourses = XLSX.utils.json_to_sheet(exportData.coursePerformance);
    XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses');

    // 7. Geographic States
    const wsStates = XLSX.utils.json_to_sheet(leadsByState);
    XLSX.utils.book_append_sheet(wb, wsStates, 'State_Distribution');

    // 8. Lead Aging
    const wsAging = XLSX.utils.json_to_sheet(leadAging);
    XLSX.utils.book_append_sheet(wb, wsAging, 'Lead_Aging');

    XLSX.writeFile(wb, `edvix-crm-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Complete multi-sheet Excel workbook exported');
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-border/60 p-3.5 rounded-2xl shadow-2xl text-xs">
          <p className="font-bold text-foreground mb-2">{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`entry-${index}`} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-muted-foreground font-medium">{entry.name}:</span>
              <span className="text-foreground font-extrabold">
                {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('revenue') 
                  ? formatCurrency(entry.value) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (isLoading && !kpis) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full space-y-6 p-4 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={`skel-kpi-${i}`} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
        <Skeleton className="h-[350px] rounded-3xl" />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
          <AlertCircle className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Failed to Load Analytics</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button 
          onClick={refresh} 
          className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] bg-gradient-to-br from-background via-muted/15 to-background">
      <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8">
        
        {/* Header & Main Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-600/20 text-primary flex items-center justify-center font-extrabold shadow-sm">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
                Enterprise Analytics & Reports
              </h1>
            </div>
            <p className="text-xs lg:text-sm font-medium text-muted-foreground mt-1.5 ml-1">
              Multi-tenant admission intelligence, funnel velocity, and counselor performance matrix.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-sm">
            {/* View Tabs */}
            <div className="flex bg-muted/60 rounded-xl p-1">
              <button
                onClick={() => setActiveView('general')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                  activeView === 'general' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                General Overview
              </button>
              <button
                onClick={() => setActiveView('dispositions')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5",
                  activeView === 'dispositions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PhoneCall className="w-3 h-3 text-blue-500" /> Dispositions
              </button>
              <button
                onClick={() => setActiveView('ai')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5",
                  activeView === 'ai' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="w-3 h-3 text-purple-500" /> AI Engine
              </button>
            </div>

            <div className="w-px h-6 bg-border mx-0.5"></div>

            {/* Export Buttons */}
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-xl font-semibold transition-all text-xs border border-border/40"
              title="Export Full Excel Workbook"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel</span>
            </button>
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-xl font-semibold transition-all text-xs border border-border/40"
              title="Export High-Res PDF"
            >
              {isExporting ? <div className="w-3.5 h-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" /> : <FileText className="w-3.5 h-3.5 text-rose-500" />}
              <span>PDF</span>
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 hover:bg-muted/80 rounded-xl transition-all border border-border/40"
              title="Refresh Analytics Data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Global Multi-Dimension Filters Bar */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Date Range Selector */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold px-1 mb-1 block">
                Date Horizon
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                className="w-full bg-background/60 border border-border/60 rounded-xl text-xs font-semibold py-2 px-3 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="Today">Today (Live)</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Quarter">This Quarter</option>
                <option value="This Year">This Year</option>
                <option value="All Time">All Time (Full Horizon)</option>
              </select>
            </div>

            {/* Counselor Filter */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold px-1 mb-1 block">
                Counselor
              </label>
              <select
                value={selectedCounselor}
                onChange={(e) => setSelectedCounselor(e.target.value)}
                className="w-full bg-background/60 border border-border/60 rounded-xl text-xs font-semibold py-2 px-3 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="All">All Counselors ({counselorNames.length})</option>
                {counselorNames.map((c, i) => (
                  <option key={`counselor-opt-${c}-${i}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* University Filter */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold px-1 mb-1 block">
                University
              </label>
              <select
                value={selectedUniversity}
                onChange={(e) => setSelectedUniversity(e.target.value)}
                className="w-full bg-background/60 border border-border/60 rounded-xl text-xs font-semibold py-2 px-3 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="All">All Universities ({universityNames.length})</option>
                {universityNames.map((u, i) => (
                  <option key={`univ-opt-${u}-${i}`} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold px-1 mb-1 block">
                Program / Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-background/60 border border-border/60 rounded-xl text-xs font-semibold py-2 px-3 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="All">All Courses ({courseNames.length})</option>
                {courseNames.map((c, i) => (
                  <option key={`course-opt-${c}-${i}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Active Filter Badges & Reset Button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-medium">Active filters:</span>
                <span className="bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-md">
                  Horizon: {datePreset}
                </span>
                {selectedCounselor !== 'All' && (
                  <span className="bg-muted text-foreground font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    Counselor: {selectedCounselor}
                    <button onClick={() => setSelectedCounselor('All')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedUniversity !== 'All' && (
                  <span className="bg-muted text-foreground font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    University: {selectedUniversity}
                    <button onClick={() => setSelectedUniversity('All')}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedCourse !== 'All' && (
                  <span className="bg-muted text-foreground font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    Course: {selectedCourse}
                    <button onClick={() => setSelectedCourse('All')}><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Dashboard Content Container */}
        <div className="flex-1" ref={dashboardRef}>
          {activeView === 'dispositions' ? (
            <DispositionAnalytics />
          ) : activeView === 'ai' ? (
            <AIRecommendationAnalytics />
          ) : (
            <div className="space-y-8 pb-12">
              
              {/* Executive 8-Grid KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    title: "Lead Inflow", 
                    value: kpis?.today_leads ?? 0, 
                    subtitle: `${kpis?.total_leads ?? 0} total leads in horizon`, 
                    icon: Users, 
                    color: "from-blue-500/20 to-blue-600/20 text-blue-500",
                    badge: "Live"
                  },
                  { 
                    title: "Active Pipeline", 
                    value: kpis?.active_leads ?? 0, 
                    subtitle: `${kpis?.qualified_leads ?? 0} qualified prospects`, 
                    icon: TrendingUp, 
                    color: "from-indigo-500/20 to-purple-600/20 text-indigo-500",
                    badge: "Pipeline"
                  },
                  { 
                    title: "Admissions Won", 
                    value: kpis?.completed_admissions ?? 0, 
                    subtitle: `${kpis?.total_admissions ?? 0} total · ${kpis?.pending_admissions ?? 0} pending`, 
                    icon: GraduationCap, 
                    color: "from-emerald-500/20 to-teal-600/20 text-emerald-500",
                    badge: "Success"
                  },
                  { 
                    title: "Conversion Win Rate", 
                    value: `${kpis?.conversion_rate ?? 0}%`, 
                    subtitle: "Calculated across leads", 
                    icon: Award, 
                    color: "from-fuchsia-500/20 to-pink-600/20 text-pink-500",
                    badge: "Efficiency"
                  },
                  { 
                    title: "Fee Collections", 
                    value: formatCurrency(kpis?.revenue_this_month ?? financeAnalytics?.monthly_revenue ?? 0), 
                    subtitle: `Cumulative: ${formatCurrency(kpis?.total_revenue ?? 0)}`, 
                    icon: IndianRupee, 
                    color: "from-amber-500/20 to-orange-600/20 text-amber-500",
                    badge: "Revenue"
                  },
                  { 
                    title: "Pending Receivables", 
                    value: formatCurrency(kpis?.pending_revenue ?? financeAnalytics?.pending_payments ?? 0), 
                    subtitle: "Outstanding student fees", 
                    icon: CreditCard, 
                    color: "from-rose-500/20 to-red-600/20 text-rose-500",
                    badge: "Dues"
                  },
                  { 
                    title: "Task Velocity", 
                    value: kpis?.tasks_completed ?? taskAnalytics?.completed ?? 0, 
                    subtitle: `${taskAnalytics?.total_tasks ?? 0} total counselor tasks`, 
                    icon: FileText, 
                    color: "from-cyan-500/20 to-blue-600/20 text-cyan-500",
                    badge: "Ops"
                  },
                  { 
                    title: "Overdue Actions", 
                    value: kpis?.tasks_overdue ?? taskAnalytics?.overdue ?? 0, 
                    subtitle: "Requires counselor follow-up", 
                    icon: AlertCircle, 
                    color: "from-red-500/20 to-rose-600/20 text-red-500",
                    badge: "Action Required"
                  }
                ].map((card, idx) => (
                  <div 
                    key={`kpi-card-${idx}`} 
                    className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.title}</span>
                        <div className="text-[10px] font-semibold text-muted-foreground/80 mt-0.5">{card.badge}</div>
                      </div>
                      <div className={cn("w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center", card.color)}>
                        <card.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">{card.value}</h2>
                      <p className="text-xs font-medium text-muted-foreground mt-2">{card.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Growth Velocity Hub (Weekly / Monthly / Daily) */}
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm hover:border-primary/20 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-blue-500 rounded-full"></div> Inflow & Admission Growth Velocity
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Multi-temporal volume tracking</p>
                  </div>

                  {/* Mode Toggles */}
                  <div className="flex bg-muted/60 rounded-xl p-1 border border-border/40 text-xs font-bold">
                    <button
                      onClick={() => setTrendMode('weekly')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        trendMode === 'weekly' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Weekly (4 Wks)
                    </button>
                    <button
                      onClick={() => setTrendMode('monthly')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        trendMode === 'monthly' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Monthly (12 Mos)
                    </button>
                    <button
                      onClick={() => setTrendMode('daily')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        trendMode === 'daily' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Daily (30 Days)
                    </button>
                  </div>
                </div>

                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {trendMode === 'monthly' ? (
                      <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMonthLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorMonthAdmissions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-60 font-medium" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '15px' }} iconType="circle" />
                        <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fill="url(#colorMonthLeads)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10b981" fill="url(#colorMonthAdmissions)" strokeWidth={2.5} />
                      </AreaChart>
                    ) : trendMode === 'daily' ? (
                      <AreaChart data={dailyLeads} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDailyLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, className: "opacity-60 font-medium" }} interval={3} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="leads" name="Daily Leads" stroke="#06b6d4" fill="url(#colorDailyLeads)" strokeWidth={2.5} />
                      </AreaChart>
                    ) : (
                      <AreaChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-60 font-medium" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '15px' }} iconType="circle" />
                        <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fill="url(#colorLeads)" strokeWidth={3} />
                        <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10b981" fill="url(#colorAdmissions)" strokeWidth={3} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversion Funnel & Lead Source Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Pipeline Funnel */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-primary rounded-full"></div> Admissions Pipeline Funnel
                    </h3>
                    <span className="text-xs font-semibold text-muted-foreground">Drop-off Ratios</span>
                  </div>
                  <div className="flex-1 min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={conversionFunnel} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-70 font-medium" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Bar dataKey="value" barSize={26} radius={[0, 8, 8, 0]}>
                          {conversionFunnel.map((_, index) => (
                            <Cell key={`funnel-cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Lead Source Donut */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-pink-500 rounded-full"></div> Omnichannel Source Attribution
                    </h3>
                    <span className="text-xs font-semibold text-muted-foreground">{leadSource.length} Active Channels</span>
                  </div>
                  <div className="flex-1 min-h-[320px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={leadSource}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={105}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {leadSource.map((_, index) => (
                            <Cell key={`source-cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-2.5 mt-4 max-h-24 overflow-y-auto p-1">
                      {leadSource.map((item, idx) => (
                        <div key={`source-legend-${idx}`} className="flex items-center gap-1.5 text-xs font-semibold">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VIBRANT_COLORS[idx % VIBRANT_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}:</span>
                          <span className="text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Geographic State Distribution & Lead Aging Cohort */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Geographic State Distribution */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                      <h3 className="font-extrabold text-lg text-foreground">Top States by Prospect Volume</h3>
                    </div>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-h-[280px]">
                    {leadsByState.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No state geographic data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsByState} layout="vertical" margin={{ top: 0, right: 20, left: 70, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                          <XAxis type="number" stroke="currentColor" className="opacity-40 text-xs" />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-70 font-medium" }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                          <Bar dataKey="value" name="Leads" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Lead Aging & Stagnation Analysis */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
                      <h3 className="font-extrabold text-lg text-foreground">Pipeline Stagnation & Aging Cohorts</h3>
                    </div>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-h-[280px]">
                    {leadAging.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No lead aging cohorts recorded.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadAging} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                          <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-70 font-medium" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                          <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]} barSize={38}>
                            {leadAging.map((entry, idx) => {
                              const colors = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'];
                              return <Cell key={`aging-cell-${idx}`} fill={colors[idx % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* University Performance & Course Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* University Performance */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-indigo-500 rounded-full"></div> University Enrollment Share
                    </h3>
                    <Building2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredUniversityPerformance} margin={{ top: 20, right: 0, left: -10, bottom: 5 }} barGap={6}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-60 font-medium" }} dy={10} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        <Bar yAxisId="right" dataKey="admissions" name="Admissions Won" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Course Analytics */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-amber-500 rounded-full"></div> Academic Course Demand
                    </h3>
                    <BookOpen className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredCoursePerformance} margin={{ top: 20, right: 0, left: -10, bottom: 5 }} barGap={6}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-60 font-medium" }} dy={10} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        <Bar yAxisId="right" dataKey="admissions" name="Admissions Won" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Counselor Team Performance Matrix with Search & Sorting */}
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden hover:border-primary/20 transition-colors">
                <div className="p-6 lg:p-8 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 bg-indigo-500 rounded-full"></div> Team Performance Matrix
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Counselor conversion rates, talk efficiency, and revenue attribution</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search counselor..."
                        value={counselorSearch}
                        onChange={(e) => setCounselorSearch(e.target.value)}
                        className="w-full bg-background/60 border border-border/60 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {filteredCounselorPerformance.length === 0 ? (
                  <div className="py-16 text-center text-sm font-medium text-muted-foreground">
                    No counselor records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                      <thead>
                        <tr>
                          <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-l-xl">
                            Counselor
                          </th>
                          <th 
                            onClick={() => {
                              if (counselorSortField === 'assigned') setCounselorSortAsc(!counselorSortAsc);
                              else { setCounselorSortField('assigned'); setCounselorSortAsc(false); }
                            }}
                            className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 cursor-pointer hover:text-foreground"
                          >
                            <div className="flex items-center gap-1">
                              Assigned <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">
                            Contacted
                          </th>
                          <th 
                            onClick={() => {
                              if (counselorSortField === 'converted') setCounselorSortAsc(!counselorSortAsc);
                              else { setCounselorSortField('converted'); setCounselorSortAsc(false); }
                            }}
                            className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 cursor-pointer hover:text-foreground"
                          >
                            <div className="flex items-center gap-1">
                              Converted <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th 
                            onClick={() => {
                              if (counselorSortField === 'winRate') setCounselorSortAsc(!counselorSortAsc);
                              else { setCounselorSortField('winRate'); setCounselorSortAsc(false); }
                            }}
                            className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 cursor-pointer hover:text-foreground"
                          >
                            <div className="flex items-center gap-1">
                              Win Rate (%) <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th 
                            onClick={() => {
                              if (counselorSortField === 'revenue') setCounselorSortAsc(!counselorSortAsc);
                              else { setCounselorSortField('revenue'); setCounselorSortAsc(false); }
                            }}
                            className="py-3.5 px-6 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-r-xl cursor-pointer hover:text-foreground"
                          >
                            <div className="flex items-center gap-1">
                              Fee Revenue <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredCounselorPerformance.map((counselor, i) => {
                          const winRate = counselor.assigned > 0 ? Math.round((counselor.converted / counselor.assigned) * 100) : 0;
                          const isTop = counselor.counselor_id === topPerformerId && counselor.converted > 0;

                          return (
                            <tr key={`counselor-row-${counselor.counselor_id || i}`} className="hover:bg-muted/20 transition-colors group">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 flex items-center justify-center font-bold shadow-sm">
                                    {counselor.name ? counselor.name.charAt(0).toUpperCase() : 'C'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                        {counselor.name}
                                      </span>
                                      {isTop && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                                          🏆 Top
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground font-medium">Academic Advisor</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-medium text-foreground">{counselor.assigned}</td>
                              <td className="py-4 px-6 font-medium text-muted-foreground">{counselor.contacted}</td>
                              <td className="py-4 px-6 font-bold text-emerald-500">{counselor.converted}</td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold w-10 text-foreground">{winRate}%</span>
                                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                      style={{ width: `${Math.min(winRate, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6 font-extrabold text-foreground">
                                {formatCurrency(counselor.revenue)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
