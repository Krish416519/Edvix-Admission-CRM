import { useState, useRef, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, AreaChart, Area
} from 'recharts';
import { Download, Users, GraduationCap, FileText, TrendingUp, IndianRupee, RefreshCw, AlertCircle } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Skeleton } from '../ui/Skeleton';
import { AIRecommendationAnalytics } from './AIRecommendationAnalytics';
import { DispositionAnalytics } from './DispositionAnalytics';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('This Month');
  const [selectedCounselor, setSelectedCounselor] = useState('All');
  const [selectedUniversity, setSelectedUniversity] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [isExporting, setIsExporting] = useState(false);
  const [activeView, setActiveView] = useState<'general' | 'ai' | 'dispositions'>('general');

  const dashboardRef = useRef<HTMLDivElement>(null);

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
  } = useAnalytics();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);

  // ── Client-side filter (applied on top of server-aggregated data) ───────

  const filteredUniversityPerformance = useMemo(() => {
    if (selectedUniversity === 'All') return universityPerformance;
    return universityPerformance.filter(u => u.name === selectedUniversity);
  }, [universityPerformance, selectedUniversity]);

  const filteredCoursePerformance = useMemo(() => {
    if (selectedCourse === 'All') return coursePerformance;
    return coursePerformance.filter(c => c.name === selectedCourse);
  }, [coursePerformance, selectedCourse]);

  const filteredCounselorPerformance = useMemo(() => {
    if (selectedCounselor === 'All') return counselorPerformance;
    return counselorPerformance.filter(c => c.name === selectedCounselor);
  }, [counselorPerformance, selectedCounselor]);

  // ── Export ────────────────────────────────────────────────────────────────

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

      pdf.save('analytics-report.pdf');
      toast.success('PDF report exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsKpis = XLSX.utils.json_to_sheet([exportData.kpis]);
    XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs');

    const wsSources = XLSX.utils.json_to_sheet(exportData.leadSource);
    XLSX.utils.book_append_sheet(wb, wsSources, 'Lead Sources');

    const wsUniv = XLSX.utils.json_to_sheet(exportData.universityPerformance);
    XLSX.utils.book_append_sheet(wb, wsUniv, 'Universities');

    const wsCounselors = XLSX.utils.json_to_sheet(exportData.counselorPerformance);
    XLSX.utils.book_append_sheet(wb, wsCounselors, 'Counselor Performance');

    XLSX.writeFile(wb, 'analytics-report.xlsx');
    toast.success('Excel report exported successfully');
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading && !kpis) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full space-y-6 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load analytics</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Live insights from your Supabase database.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted rounded-lg p-1 border border-border mr-2">
            <button
              onClick={() => setActiveView('general')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'general' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              General
            </button>
            <button
              onClick={() => setActiveView('ai')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'ai' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              AI Engine
            </button>
            <button
              onClick={() => setActiveView('dispositions')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'dispositions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Dispositions
            </button>
          </div>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-border"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            {isExporting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            title="Refresh analytics"
            className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-3 py-2 rounded-lg font-medium transition-colors text-sm border border-border"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-2 flex flex-col">
          <label className="text-xs text-muted-foreground font-medium px-2 pt-1">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium focus:ring-0 w-full"
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl p-2 flex flex-col">
          <label className="text-xs text-muted-foreground font-medium px-2 pt-1">Counselor</label>
          <select
            value={selectedCounselor}
            onChange={(e) => setSelectedCounselor(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium focus:ring-0 w-full"
          >
            <option>All</option>
            {counselorNames.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl p-2 flex flex-col">
          <label className="text-xs text-muted-foreground font-medium px-2 pt-1">University</label>
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium focus:ring-0 w-full"
          >
            <option>All</option>
            {universityNames.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl p-2 flex flex-col">
          <label className="text-xs text-muted-foreground font-medium px-2 pt-1">Course</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium focus:ring-0 w-full"
          >
            <option>All</option>
            {courseNames.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-8 hide-scrollbar" ref={dashboardRef}>
        <div className="bg-background">

          {activeView === 'dispositions' ? (
            <DispositionAnalytics />
          ) : activeView === 'ai' ? (
            <AIRecommendationAnalytics />
          ) : (
            <>
              {/* KPIs — Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Today's Leads</h3>
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.today_leads ?? 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">{kpis?.total_leads ?? 0} total leads</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Active Leads</h3>
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.active_leads ?? 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">{kpis?.qualified_leads ?? 0} qualified</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Admissions Done</h3>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.completed_admissions ?? 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">{kpis?.total_admissions ?? 0} total · {kpis?.pending_admissions ?? 0} pending</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Conversion Rate</h3>
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.conversion_rate ?? 0}%</h2>
              <p className="text-xs text-emerald-500 mt-1">Live · auto-updated</p>
            </div>
          </div>

          {/* KPIs — Row 2 (Finance & Tasks) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Revenue This Month</h3>
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{formatCurrency(kpis?.revenue_this_month ?? financeAnalytics?.monthly_revenue ?? 0)}</h2>
              <p className="text-xs text-muted-foreground mt-1">Total: {formatCurrency(kpis?.total_revenue ?? 0)}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Pending Revenue</h3>
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">{formatCurrency(kpis?.pending_revenue ?? 0)}</h2>
              <p className="text-xs text-muted-foreground mt-1">Outstanding dues</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Tasks Completed</h3>
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.tasks_completed ?? taskAnalytics?.completed ?? 0}</h2>
              <p className="text-xs text-muted-foreground mt-1">{taskAnalytics?.total_tasks ?? 0} total tasks</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-muted-foreground">Overdue Tasks</h3>
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-foreground">{kpis?.tasks_overdue ?? taskAnalytics?.overdue ?? 0}</h2>
              <p className="text-xs text-red-500 mt-1">Needs attention</p>
            </div>
          </div>

          {/* Conversion Funnel + Lead Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-6">Conversion Funnel</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={conversionFunnel} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" barSize={28} radius={[0, 4, 4, 0]}>
                      {conversionFunnel.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-6">Lead Sources</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSource}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {leadSource.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* University & Course Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-6">University Performance</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredUniversityPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#6366f1" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="right" dataKey="admissions" name="Admissions" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-6">Course Performance</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCoursePerformance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar yAxisId="right" dataKey="admissions" name="Admissions" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Counselor Performance Table */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-foreground mb-4">Counselor Performance</h3>
            {filteredCounselorPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No counselor data available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Counselor</th>
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Assigned Leads</th>
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Contacted</th>
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Converted</th>
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Conversion Rate</th>
                      <th className="py-3 px-4 text-sm font-semibold text-muted-foreground">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCounselorPerformance.map((counselor, i) => (
                      <tr key={i} className="hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
                              {counselor.name.charAt(0)}
                            </div>
                            <span className="font-medium">{counselor.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">{counselor.assigned}</td>
                        <td className="py-4 px-4 text-sm">{counselor.contacted}</td>
                        <td className="py-4 px-4 text-sm font-medium text-emerald-600 dark:text-emerald-500">{counselor.converted}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {counselor.assigned > 0 ? Math.round((counselor.converted / counselor.assigned) * 100) : 0}%
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${counselor.assigned > 0 ? (counselor.converted / counselor.assigned) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">{formatCurrency(counselor.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Admissions Pipeline + Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-6">Admissions Pipeline</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={admissionsPipeline} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis dataKey="stage" type="category" width={140} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f3f4f6' }} />
                    <Bar dataKey="count" name="Admissions" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Admissions Performance</h3>
              <div className="space-y-6 mt-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-foreground">{kpis?.conversion_rate ?? 0}%</p>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kpis?.conversion_rate ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Admissions Completed</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(kpis?.total_admissions ?? 0) > 0 ? Math.round(((kpis?.completed_admissions ?? 0) / kpis!.total_admissions) * 100) : 0}%
                    </p>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(kpis?.total_admissions ?? 0) > 0 ? ((kpis?.completed_admissions ?? 0) / kpis!.total_admissions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Pending Verifications</p>
                    <p className="text-2xl font-bold text-foreground">
                      {admissionsPipeline.find(p => p.stage === 'University Verification')?.count ?? 0}
                    </p>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[35%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-foreground mb-6">Weekly Trend (Last 4 Weeks)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fill="url(#colorLeads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10b981" fill="url(#colorAdmissions)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          </>
          )}

        </div>
      </div>
    </div>
  );
}
