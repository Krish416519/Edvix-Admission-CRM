
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BarChart3, TrendingUp, Filter, Calendar, LayoutDashboard, PieChart, LineChart, FileText } from 'lucide-react';
import { useBI, DateRangePreset } from '../../contexts/BIContext';
import { format } from 'date-fns';

export function BILayout() {
  const { datePreset, setDatePreset, currentRange } = useBI();
  const location = useLocation();

  const presets: DateRangePreset[] = [
    'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Month', 'This Quarter', 'This Year'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* BI Command Center Header */}
      <div className="shrink-0 border-b border-border bg-card px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">BI Command Center</h1>
            <p className="text-xs text-muted-foreground">Advanced Revenue & Funnel Analytics</p>
          </div>
        </div>

        {/* Global Date Filter */}
        <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-lg border border-border">
          <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
          <select 
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
            className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer pr-8"
          >
            {presets.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="px-3 py-1 bg-background rounded border border-border text-xs font-medium text-muted-foreground hidden sm:block">
            {format(currentRange.startDate, 'MMM d, yyyy')} - {format(currentRange.endDate, 'MMM d, yyyy')}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 shrink-0 border-r border-border bg-card/50 overflow-y-auto hidden md:block">
          <div className="p-4 space-y-1">
            <NavLink
              to="/admin/bi"
              end
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Executive Summary
            </NavLink>
            <NavLink
              to="/admin/bi/funnel"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Filter className="w-4 h-4" /> Funnel Leakage
            </NavLink>
            <NavLink
              to="/admin/bi/revenue"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <TrendingUp className="w-4 h-4" /> Revenue Forecast
            </NavLink>
            <NavLink
              to="/admin/bi/performance"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <PieChart className="w-4 h-4" /> Performance Analytics
            </NavLink>
            
            <div className="pt-4 pb-2 mt-4 border-t border-border">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Reports</p>
            </div>
            
            <NavLink
              to="/admin/bi/reports"
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <FileText className="w-4 h-4" /> Report Builder
            </NavLink>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
