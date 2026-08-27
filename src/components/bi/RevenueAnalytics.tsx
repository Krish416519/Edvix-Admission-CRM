import { useEffect, useState } from 'react';
import { useBI } from '../../contexts/BIContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Loader2, TrendingUp, DollarSign, Target, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

export function RevenueAnalytics() {
  const { currentRange } = useBI();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [atRisk, setAtRisk] = useState<any>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [currentRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const [forecastRes, atRiskRes] = await Promise.all([
        supabase.rpc('get_bi_revenue_forecast', { p_days: 30 }),
        supabase.rpc('get_bi_at_risk_revenue')
      ]);

      if (forecastRes.error) throw forecastRes.error;
      if (atRiskRes.error) throw atRiskRes.error;

      setForecast(forecastRes.data);
      setAtRisk(atRiskRes.data);
    } catch (error: any) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Revenue Analytics & Forecast</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Forecast Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6 opacity-90">
              <CalendarDays className="w-5 h-5" />
              <h3 className="font-medium">30-Day Revenue Forecast</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Expected Revenue Pipeline</p>
                <p className="text-4xl font-bold">₹{(forecast?.expected_revenue || 0).toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-400/30">
                <div>
                  <p className="text-emerald-100 text-xs">Expected Admissions</p>
                  <p className="text-xl font-semibold">{forecast?.expected_admissions || 0}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs">Hist. Conversion</p>
                  <p className="text-xl font-semibold">{forecast?.historical_conversion_rate_pct}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* At Risk Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold">At-Risk Revenue</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Stalled Pending Payments (&gt;7 days)</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">₹{(atRisk?.stalled_pending_revenue || 0).toLocaleString()}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-muted-foreground text-xs">Stalled Payments</p>
                <p className="text-xl font-semibold">{atRisk?.stalled_payment_count || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Stalled Admissions</p>
                <p className="text-xl font-semibold">{atRisk?.stalled_admission_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Placeholder for Cohort Analysis Chart */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6 h-[400px] flex flex-col items-center justify-center text-center">
        <DollarSign className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Revenue Cohorts</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Detailed cohort analysis by lead month will be rendered here. The Materialized View <code>mv_bi_revenue_cohorts</code> is actively tracking this data.
        </p>
      </div>

    </div>
  );
}
