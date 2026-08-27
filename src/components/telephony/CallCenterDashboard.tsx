import { useState } from 'react';
import { Phone, PhoneIncoming, PhoneMissed, Clock, Users, Activity, BarChart2, Settings, History, Sparkles } from 'lucide-react';
import { useCallReports } from '../../hooks/useCallReports';
import { CallHistoryPanel } from './CallHistoryPanel';
import { CallReportsPanel } from './CallReportsPanel';
import { ProviderSettings } from './ProviderSettings';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function CallCenterDashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['Super Admin', 'Admin']);
  
  // Date range state (default 30 days)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  const { stats, counselorStats, reportData, recentCalls, isLoading } = useCallReports(dateRange);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports' | 'settings'>('dashboard');

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Phone className="w-6 h-6 text-primary" /> Call Center Operations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Live overview of telephony and AI-driven insights.</p>
        </div>

        {/* Top Tabs */}
        <div className="flex p-1 bg-muted rounded-lg w-full sm:w-auto overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn("px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2", activeTab === 'dashboard' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <Activity className="w-4 h-4" /> Live Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2", activeTab === 'history' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <History className="w-4 h-4" /> Call History
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn("px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2", activeTab === 'reports' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <BarChart2 className="w-4 h-4" /> Reports & AI
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2", activeTab === 'settings' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          )}
        </div>
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Active Calls</h3>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                  <Phone className={cn("w-5 h-5", stats?.activeCalls ? "animate-pulse" : "")} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {isLoading ? '...' : stats?.activeCalls || 0}
              </p>
              <p className="text-sm text-emerald-600 mt-2 font-medium flex items-center gap-1">
                <span className={cn("w-2 h-2 rounded-full", stats?.activeCalls ? "bg-emerald-500 animate-pulse" : "bg-gray-400")}></span> Live
              </p>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Total Today</h3>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  <PhoneIncoming className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {isLoading ? '...' : stats?.totalToday || 0}
              </p>
              {stats && (
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.totalToday > stats.totalYesterday ? '+' : ''}
                  {stats.totalYesterday > 0 ? Math.round(((stats.totalToday - stats.totalYesterday) / stats.totalYesterday) * 100) : 100}% from yesterday
                </p>
              )}
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Missed Calls</h3>
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                  <PhoneMissed className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {isLoading ? '...' : stats?.missedToday || 0}
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">Action Required</p>
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Avg Talk Time</h3>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {isLoading ? '...' : formatDuration(stats?.avgDurationSeconds || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Completed calls only</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[500px]">
              <CallHistoryPanel calls={recentCalls} isLoading={isLoading} />
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm h-[500px] flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Counselor Performance
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                   <div className="flex justify-center items-center h-full">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                   </div>
                ) : counselorStats.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No data available for this period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {counselorStats.map((c) => (
                      <div key={c.counselorId} className="flex flex-col gap-2 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm text-foreground">{c.counselorName}</span>
                          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                            {c.connectionRate}% Conn
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><PhoneIncoming className="w-3 h-3"/> {c.totalCalls} Calls</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDuration(c.avgDuration)} avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="h-[75vh] animate-in fade-in duration-300">
           <CallHistoryPanel calls={recentCalls} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="animate-in fade-in duration-300">
           <CallReportsPanel data={reportData} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'settings' && isAdmin && (
        <div className="max-w-4xl animate-in fade-in duration-300">
          <ProviderSettings />
        </div>
      )}
    </div>
  );
}
