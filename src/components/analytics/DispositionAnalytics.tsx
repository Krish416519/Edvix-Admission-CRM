import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, CheckCircle2, 
  AlertCircle, TrendingUp, Sparkles, Filter, RefreshCw, BarChart2,
  Calendar, UserCheck, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

interface CallRecord {
  id: string;
  lead_id?: string;
  counselor_id?: string;
  direction?: string;
  status?: string;
  duration_seconds: number;
  outcome?: string;
  notes?: string;
  ai_sentiment?: string;
  created_at: string;
  counselor_name?: string;
  lead_name?: string;
  lead_phone?: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  'Interested': '#10b981',
  'Admitted': '#059669',
  'Call Back Requested': '#3b82f6',
  'Follow Up': '#6366f1',
  'Connected': '#06b6d4',
  'Not Interested': '#f43f5e',
  'Invalid Number': '#6b7280',
  'Busy': '#f59e0b',
  'No Answer': '#94a3b8',
  'Voicemail': '#8b5cf6',
  'Other': '#d946ef'
};

const SENTIMENT_COLORS: Record<string, string> = {
  'positive': '#10b981',
  'neutral': '#3b82f6',
  'negative': '#f43f5e',
  'unknown': '#94a3b8'
};

export function DispositionAnalytics() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'outbound' | 'inbound'>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setCalls(data || []);
    } catch (err) {
      console.error('[DispositionAnalytics] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();

    const channel = supabase.channel('disposition-analytics-calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        fetchCalls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCalls]);

  const filteredCalls = useMemo(() => {
    return calls.filter(c => {
      if (selectedDirection !== 'all' && c.direction?.toLowerCase() !== selectedDirection) return false;
      if (selectedSentiment !== 'all' && (c.ai_sentiment?.toLowerCase() || 'unknown') !== selectedSentiment) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const leadMatch = c.lead_name?.toLowerCase().includes(query) || c.lead_phone?.includes(query);
        const counselorMatch = c.counselor_name?.toLowerCase().includes(query);
        const outcomeMatch = c.outcome?.toLowerCase().includes(query);
        if (!leadMatch && !counselorMatch && !outcomeMatch) return false;
      }
      return true;
    });
  }, [calls, selectedDirection, selectedSentiment, searchQuery]);

  // Telephony KPIs
  const totalCalls = filteredCalls.length;
  const connectedCalls = filteredCalls.filter(c => (c.duration_seconds > 0) || c.status === 'completed').length;
  const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  
  const totalDuration = filteredCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const avgDurationSeconds = connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0;
  
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining}s`;
  };

  const positiveOutcomes = filteredCalls.filter(c => {
    const o = (c.outcome || '').toLowerCase();
    return o.includes('interest') || o.includes('admit') || o.includes('call back') || o.includes('follow');
  }).length;
  const positiveRate = totalCalls > 0 ? Math.round((positiveOutcomes / totalCalls) * 100) : 0;

  // Outcome distribution data for charts
  const outcomeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCalls.forEach(c => {
      const outcome = c.outcome || 'No Outcome Logged';
      counts[outcome] = (counts[outcome] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: OUTCOME_COLORS[name] || '#6366f1'
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCalls]);

  // Sentiment distribution
  const sentimentData = useMemo(() => {
    const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0, unknown: 0 };
    filteredCalls.forEach(c => {
      const s = (c.ai_sentiment?.toLowerCase() || 'unknown');
      if (counts[s] !== undefined) {
        counts[s]++;
      } else {
        counts.unknown++;
      }
    });

    return [
      { name: 'Positive', value: counts.positive, color: SENTIMENT_COLORS.positive },
      { name: 'Neutral', value: counts.neutral, color: SENTIMENT_COLORS.neutral },
      { name: 'Negative', value: counts.negative, color: SENTIMENT_COLORS.negative },
      { name: 'Unanalyzed', value: counts.unknown, color: SENTIMENT_COLORS.unknown },
    ].filter(item => item.value > 0);
  }, [filteredCalls]);

  // Hourly calling distribution
  const hourlyData = useMemo(() => {
    const hourBuckets: Record<string, number> = {};
    for (let h = 9; h <= 20; h++) {
      const label = `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
      hourBuckets[label] = 0;
    }

    filteredCalls.forEach(c => {
      if (!c.created_at) return;
      const date = new Date(c.created_at);
      const h = date.getHours();
      if (h >= 9 && h <= 20) {
        const label = `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
        if (hourBuckets[label] !== undefined) {
          hourBuckets[label]++;
        }
      }
    });

    return Object.entries(hourBuckets).map(([hour, count]) => ({ hour, count }));
  }, [filteredCalls]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-border/60 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-semibold text-foreground mb-1">{label || payload[0]?.name}</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0]?.payload?.color || payload[0]?.color }} />
            <span className="text-muted-foreground font-medium">Count:</span>
            <span className="text-foreground font-bold">{payload[0]?.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && calls.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px] rounded-3xl" />
          <Skeleton className="h-[380px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Sub-Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-500 flex items-center justify-center font-bold">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Telephony & Call Dispositions</h2>
            <p className="text-xs text-muted-foreground">Real-time outcome analytics connected to live telephony logs</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-muted/60 rounded-xl p-1 border border-border/40 text-xs">
            <button
              onClick={() => setSelectedDirection('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all",
                selectedDirection === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Calls
            </button>
            <button
              onClick={() => setSelectedDirection('outbound')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1",
                selectedDirection === 'outbound' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PhoneOutgoing className="w-3 h-3 text-blue-500" /> Outbound
            </button>
            <button
              onClick={() => setSelectedDirection('inbound')}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1",
                selectedDirection === 'inbound' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PhoneIncoming className="w-3 h-3 text-emerald-500" /> Inbound
            </button>
          </div>

          <button
            onClick={fetchCalls}
            disabled={loading}
            className="p-2 hover:bg-muted/80 rounded-xl transition-all border border-border/40"
            title="Refresh Call Data"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total Calls</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground">{totalCalls}</h2>
          <p className="text-xs font-medium text-muted-foreground mt-2">
            {filteredCalls.filter(c => c.direction === 'outbound').length} outbound · {filteredCalls.filter(c => c.direction === 'inbound').length} inbound
          </p>
        </div>

        <div className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Connect Rate</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground">{connectRate}%</h2>
          <p className="text-xs font-medium text-muted-foreground mt-2">
            {connectedCalls} calls connected successfully
          </p>
        </div>

        <div className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Average Handling Time</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground">{formatDuration(avgDurationSeconds)}</h2>
          <p className="text-xs font-medium text-muted-foreground mt-2">
            Total talk time: {Math.round(totalDuration / 60)} mins
          </p>
        </div>

        <div className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Positive Disposition</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground">{positiveRate}%</h2>
          <p className="text-xs font-medium text-muted-foreground mt-2">
            {positiveOutcomes} high-intent prospect transitions
          </p>
        </div>
      </div>

      {/* Advanced Telephony Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Outcome Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div> Logged Call Dispositions
            </h3>
            <span className="text-xs font-medium text-muted-foreground">Sorted by frequency</span>
          </div>
          <div className="flex-1 min-h-[320px]">
            {outcomeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No disposition outcomes logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="opacity-40 text-xs" />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-70 font-medium" }} />
                  <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
                  <Bar dataKey="value" barSize={24} radius={[0, 8, 8, 0]}>
                    {outcomeData.map((entry, index) => (
                      <Cell key={`outcome-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Call Sentiment Analysis Donut */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              <div className="w-2 h-6 bg-purple-500 rounded-full"></div> AI Call Sentiment
            </h3>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center">
            {sentimentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sentiment data recorded.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`sentiment-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs font-semibold">
              {sentimentData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}:</span>
                  <span className="text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Hourly Calling Velocity & Best Time to Call */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-sm hover:border-primary/20 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div> Hourly Calling Pattern (9:00 AM – 8:00 PM)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Identifies peak connection velocity and optimal outreach windows</p>
          </div>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-60" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 11, className: "opacity-40" }} />
              <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: 'currentColor', className: 'opacity-5 rounded-xl' }} />
              <Bar dataKey="count" name="Calls" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Recent Call Log Feed */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm overflow-hidden hover:border-primary/20 transition-colors">
        <div className="p-6 lg:p-8 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
              <div className="w-2 h-6 bg-indigo-500 rounded-full"></div> Live Telephony Stream
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Latest verified call interactions across counselors</p>
          </div>
          <input
            type="text"
            placeholder="Search lead, phone, counselor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-background/60 border border-border/60 rounded-xl px-3 py-2 text-xs focus:ring-primary focus:border-primary"
          />
        </div>

        {filteredCalls.length === 0 ? (
          <div className="p-12 text-center text-sm font-medium text-muted-foreground">
            No calls matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-l-xl">Lead / Prospect</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Counselor</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Type</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Duration</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Outcome</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30">Sentiment</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 rounded-r-xl">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredCalls.slice(0, 10).map((call) => (
                  <tr key={call.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{call.lead_name || 'Prospect'}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{call.lead_phone || 'N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {call.counselor_name || 'Counselor'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px]",
                        call.direction === 'inbound' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {call.direction === 'inbound' ? <PhoneIncoming className="w-3 h-3" /> : <PhoneOutgoing className="w-3 h-3" />}
                        {call.direction || 'outbound'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {formatDuration(call.duration_seconds || 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-lg font-bold text-[11px]"
                        style={{
                          backgroundColor: `${OUTCOME_COLORS[call.outcome || ''] || '#6366f1'}15`,
                          color: OUTCOME_COLORS[call.outcome || ''] || '#6366f1'
                        }}
                      >
                        {call.outcome || 'Connected'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] capitalize",
                        call.ai_sentiment === 'positive' ? "bg-emerald-500/10 text-emerald-500" :
                        call.ai_sentiment === 'negative' ? "bg-rose-500/10 text-rose-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {call.ai_sentiment || 'neutral'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {call.created_at ? new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
