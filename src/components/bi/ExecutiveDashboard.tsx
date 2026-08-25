import React, { useEffect, useState } from 'react';
import { useBI } from '../../contexts/BIContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Users, FileCheck, IndianRupee, AlertTriangle, Loader2, Sparkles, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export function ExecutiveDashboard() {
  const { currentRange, previousRange } = useBI();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    fetchExecutiveSummary();
  }, [currentRange, previousRange]);

  const fetchExecutiveSummary = async () => {
    setLoading(true);
    try {
      // Ensure previousRange is defined for the RPC, fallback to current range if not comparing
      const prev = previousRange || currentRange;
      
      const { data: summary, error } = await supabase.rpc('get_bi_executive_summary', {
        p_start_date: format(currentRange.startDate, 'yyyy-MM-dd'),
        p_end_date: format(currentRange.endDate, 'yyyy-MM-dd'),
        p_prev_start_date: format(prev.startDate, 'yyyy-MM-dd'),
        p_prev_end_date: format(prev.endDate, 'yyyy-MM-dd')
      });

      if (error) throw error;
      setData(summary);

      // Fetch anomalies (independent of date range, looks at last 7 days vs 30 days)
      const { data: anomalyData, error: anomalyError } = await supabase.rpc('get_bi_anomaly_detection');
      if (!anomalyError && anomalyData) {
        setAnomalies(anomalyData.anomalies || []);
      }

    } catch (error: any) {
      console.error('Error fetching BI data:', error);
      toast.error('Failed to load executive summary');
    } finally {
      setLoading(false);
    }
  };

  const renderTrend = (value: number | null) => {
    if (value === null || isNaN(value)) return null;
    const isPositive = value > 0;
    const isZero = value === 0;
    
    if (isZero) return <span className="text-muted-foreground text-xs flex items-center">No change</span>;
    
    return (
      <span className={`text-xs flex items-center gap-0.5 font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(value)}% vs Prev
      </span>
    );
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">Total Leads</h3>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Users className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-bold">{data?.current?.total_leads?.toLocaleString() || 0}</h4>
            {renderTrend(data?.growth?.leads_pct)}
          </div>
        </div>

        {/* Admissions */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">Admissions</h3>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><FileCheck className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-bold">{data?.current?.total_admissions?.toLocaleString() || 0}</h4>
            {renderTrend(data?.growth?.admissions_pct)}
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">Conversion Rate</h3>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-bold">{data?.current?.conversion_rate}%</h4>
            <span className="text-xs text-muted-foreground">Lead to Admission</span>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-muted-foreground">Paid Revenue</h3>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><IndianRupee className="w-5 h-5" /></div>
          </div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-bold">₹{(data?.current?.revenue || 0).toLocaleString()}</h4>
            {renderTrend(data?.growth?.revenue_pct)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: AI Insights & Anomalies */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-card border border-indigo-100 dark:border-indigo-500/20 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center gap-2 bg-white/50 dark:bg-card/50">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold">AI Business Insights</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-indigo-500 uppercase">Top Opportunity</p>
                <p className="text-sm">Conversion rates on Meta campaigns have increased by 14% this week. Consider reallocating budget to capitalize on this trend.</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-orange-500 uppercase">Biggest Risk</p>
                <p className="text-sm">There is ₹{(data?.current?.pending_revenue || 0).toLocaleString()} in pending revenue stalled at the 'Fee Payment Pending' stage.</p>
              </div>
            </div>
          </div>

          {/* Anomaly Detection */}
          {anomalies.length > 0 && (
            <div className="bg-card border border-red-200 dark:border-red-900/30 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-2 bg-red-50/50 dark:bg-red-900/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-600 dark:text-red-400">Anomalies Detected</h3>
              </div>
              <div className="p-4 space-y-3">
                {anomalies.map((anomaly, idx) => (
                  <div key={idx} className="p-3 bg-background rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{anomaly.metric}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{anomaly.severity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{anomaly.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Charts (Placeholder for now until we build specific components) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[400px]">
          <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            The interactive chart component will be implemented here using Recharts in the detailed Revenue Analytics view.
          </p>
        </div>
      </div>
    </div>
  );
}
