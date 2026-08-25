import { useState, useRef, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, AreaChart, Area
} from 'recharts';
import { Download, Users, GraduationCap, FileText, TrendingUp, IndianRupee, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Skeleton } from '../ui/Skeleton';
import { AIRecommendationAnalytics } from './AIRecommendationAnalytics';
import { DispositionAnalytics } from './DispositionAnalytics';
import { cn } from '../../lib/utils';

// Modern, vibrant color palette for charts
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

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

  // ── Client-side filter ───────

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
        backgroundColor: '#ffffff', // Ensures PDF background matches light mode
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

  // ── Loading Skeleton ──────────────────────────────────────────────────────

  if (isLoading && !kpis) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full space-y-6 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
        <Skeleton className="h-[300px] rounded-3xl" />
      </div>
    );
  }

  if (error && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-destructive/80 animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Failed to load analytics</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button onClick={refresh} className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-semibold transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 p-4 rounded-xl shadow-2xl">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground font-medium">{entry.name}:</span>
              <span className="text-foreground font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto w-full p-4 lg:p-8">
        
        {/* Header & Main Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              Analytics & Reports
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Real-time insights powered by your CRM engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-card/40 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-sm">
            <div className="flex bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setActiveView('general')}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300",
                  activeView === 'general' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                General
              </button>
              <button
                onClick={() => setActiveView('ai')}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2",
                  activeView === 'ai' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" /> AI Engine
              </button>
              <button
                onClick={() => setActiveView('dispositions')}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300",
                  activeView === 'dispositions' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                Dispositions
              </button>
            </div>
            <div className="w-px h-8 bg-border mx-1"></div>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl font-medium transition-all text-sm"
            >
              <Download className="w-4 h-4 text-emerald-500" />
              Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl font-medium transition-all text-sm"
            >
              {isExporting ? <div className="w-4 h-4 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" /> : <FileText className="w-4 h-4 text-rose-500" />}
              PDF
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 hover:bg-muted/80 rounded-xl transition-all"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Global Filters - Glassmorphic Bar */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex flex-wrap gap-4 mb-8 shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1 block">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-background/50 border-border/50 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary transition-all"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1 block">Counselor</label>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full bg-background/50 border-border/50 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary transition-all"
            >
              <option>All Counselors</option>
              {counselorNames.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1 block">University</label>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full bg-background/50 border-border/50 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary transition-all"
            >
              <option>All Universities</option>
              {universityNames.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1 block">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-background/50 border-border/50 rounded-xl text-sm font-medium focus:ring-primary focus:border-primary transition-all"
            >
              <option>All Courses</option>
              {courseNames.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div className="flex-1" ref={dashboardRef}>
          {activeView === 'dispositions' ? (
            <DispositionAnalytics />
          ) : activeView === 'ai' ? (
            <AIRecommendationAnalytics />
          ) : (
            <div className="space-y-8 pb-12">
              
              {/* Premium KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Today's Leads", value: kpis?.today_leads ?? 0, subtitle: `${kpis?.total_leads ?? 0} total leads`, icon: Users, color: "from-blue-500/20 to-blue-600/20 text-blue-500" },
                  { title: "Active Pipeline", value: kpis?.active_leads ?? 0, subtitle: `${kpis?.qualified_leads ?? 0} qualified`, icon: TrendingUp, color: "from-indigo-500/20 to-purple-600/20 text-indigo-500" },
                  { title: "Admissions Won", value: kpis?.completed_admissions ?? 0, subtitle: `${kpis?.total_admissions ?? 0} total · ${kpis?.pending_admissions ?? 0} pending`, icon: GraduationCap, color: "from-emerald-500/20 to-teal-600/20 text-emerald-500" },
                  { title: "Conversion Rate", value: `${kpis?.conversion_rate ?? 0}%`, subtitle: "Auto-calculated", icon: TrendingUp, color: "from-fuchsia-500/20 to-pink-600/20 text-pink-500" },
                  { title: "Current Revenue", value: formatCurrency(kpis?.revenue_this_month ?? financeAnalytics?.monthly_revenue ?? 0), subtitle: `Total: ${formatCurrency(kpis?.total_revenue ?? 0)}`, icon: IndianRupee, color: "from-amber-500/20 to-orange-600/20 text-amber-500" },
                  { title: "Pending Dues", value: formatCurrency(kpis?.pending_revenue ?? 0), subtitle: "Outstanding collections", icon: IndianRupee, color: "from-rose-500/20 to-red-600/20 text-rose-500" },
                  { title: "Tasks Completed", value: kpis?.tasks_completed ?? taskAnalytics?.completed ?? 0, subtitle: `${taskAnalytics?.total_tasks ?? 0} total tasks`, icon: FileText, color: "from-cyan-500/20 to-blue-600/20 text-cyan-500" },
                  { title: "Overdue Actions", value: kpis?.tasks_overdue ?? taskAnalytics?.overdue ?? 0, subtitle: "Requires immediate attention", icon: AlertCircle, color: "from-red-500/20 to-rose-600/20 text-red-500" }
                ].map((card, idx) => (
                  <div key={idx} className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <h3 className="font-semibold text-sm text-muted-foreground tracking-wide">{card.title}</h3>
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

              {/* Advanced Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Conversion Funnel */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <h3 className="font-extrabold text-lg text-foreground mb-8 flex items-center gap-2">
                    <div className="w-2 h-6 bg-primary rounded-full"></div> Pipeline Funnel
                  </h3>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={conversionFunnel} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-60 font-medium" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Bar dataKey="value" barSize={32} radius={[0, 8, 8, 0]}>
                          {conversionFunnel.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Lead Sources Pie */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <h3 className="font-extrabold text-lg text-foreground mb-8 flex items-center gap-2">
                    <div className="w-2 h-6 bg-pink-500 rounded-full"></div> Lead Distribution
                  </h3>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadSource}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={130}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {leadSource.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* University Performance */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <h3 className="font-extrabold text-lg text-foreground mb-8 flex items-center gap-2">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div> University Performance
                  </h3>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredUniversityPerformance} margin={{ top: 20, right: 0, left: 0, bottom: 5 }} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-60 font-medium" }} dy={10} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar yAxisId="right" dataKey="admissions" name="Admissions" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Course Performance */}
                <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                  <h3 className="font-extrabold text-lg text-foreground mb-8 flex items-center gap-2">
                    <div className="w-2 h-6 bg-amber-500 rounded-full"></div> Course Analytics
                  </h3>
                  <div className="flex-1 min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredCoursePerformance} margin={{ top: 20, right: 0, left: 0, bottom: 5 }} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-60 font-medium" }} dy={10} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar yAxisId="left" dataKey="leads" name="Total Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar yAxisId="right" dataKey="admissions" name="Admissions" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Counselor Performance Table */}
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden hover:border-primary/20 transition-colors">
                <div className="p-8 border-b border-border/50">
                  <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                    <div className="w-2 h-6 bg-indigo-500 rounded-full"></div> Team Performance Matrix
                  </h3>
                </div>
                {filteredCounselorPerformance.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground text-center py-12">No counselor data available.</p>
                ) : (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-l-xl">Counselor</th>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Assigned</th>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Contacted</th>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Converted</th>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Win Rate</th>
                          <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-r-xl">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredCounselorPerformance.map((counselor, i) => (
                          <tr key={i} className="hover:bg-muted/20 transition-colors group">
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 flex items-center justify-center font-bold shadow-sm">
                                  {counselor.name.charAt(0)}
                                </div>
                                <span className="font-bold text-foreground group-hover:text-primary transition-colors">{counselor.name}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 font-medium text-muted-foreground">{counselor.assigned}</td>
                            <td className="py-5 px-6 font-medium text-muted-foreground">{counselor.contacted}</td>
                            <td className="py-5 px-6 font-bold text-emerald-500">{counselor.converted}</td>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold w-10">
                                  {counselor.assigned > 0 ? Math.round((counselor.converted / counselor.assigned) * 100) : 0}%
                                </span>
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                    style={{ width: `${counselor.assigned > 0 ? (counselor.converted / counselor.assigned) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6 font-bold text-foreground">{formatCurrency(counselor.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Growth Trend */}
              <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm hover:border-primary/20 transition-colors">
                <h3 className="font-extrabold text-lg text-foreground mb-8 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded-full"></div> Growth Velocity (4 Weeks)
                </h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-60 font-medium" }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 12, className: "opacity-40" }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '3 3', className: 'opacity-20' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                      <Area type="monotone" dataKey="leads" name="Leads" stroke="#6366f1" fill="url(#colorLeads)" strokeWidth={3} activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#10b981" fill="url(#colorAdmissions)" strokeWidth={3} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
