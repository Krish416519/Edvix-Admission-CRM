import { useState } from 'react';
import { BarChart, TrendingUp, Clock, AlertTriangle, ShieldCheck, Download, Calendar } from 'lucide-react';


export function UniversityOpsAnalytics() {
  const [timeRange, setTimeRange] = useState('30d');

  // Static mock data for now, would be replaced with real BI endpoints
  const stats = {
    avgProcessingTime: '4.2 days',
    slaCompliance: '88%',
    approvalRate: '65%',
    totalSubmissions: 342
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Analyze submission velocity and university performance</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="pl-3 pr-8 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all appearance-none text-foreground"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-background border border-input text-foreground rounded-lg hover:bg-muted transition-colors shadow-sm whitespace-nowrap text-sm font-medium">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Submissions</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalSubmissions}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">↑ 12% vs previous period</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Approval Rate</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.approvalRate}</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">Across all universities</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Avg Processing</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.avgProcessingTime}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">↓ 0.5 days vs previous</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">SLA Compliance</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.slaCompliance}</p>
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">↓ 2% vs previous period</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm min-h-[400px] flex flex-col items-center justify-center">
          <BarChart className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Submission Volume</h3>
          <p className="text-sm text-muted-foreground mt-1">Chart visualization would appear here</p>
        </div>
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm min-h-[400px] flex flex-col items-center justify-center">
          <Calendar className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Turnaround Time by University</h3>
          <p className="text-sm text-muted-foreground mt-1">Chart visualization would appear here</p>
        </div>
      </div>
    </div>
  );
}
