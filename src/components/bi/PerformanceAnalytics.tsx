import { useEffect, useState } from 'react';
import { useBI } from '../../contexts/BIContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Loader2, Users, Target } from 'lucide-react';
import { toast } from 'sonner';

export function PerformanceAnalytics() {
  const { currentRange } = useBI();
  const [loading, setLoading] = useState(true);
  const [counselorData, setCounselorData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);

  useEffect(() => {
    fetchPerformanceData();
  }, [currentRange]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const [counselorRes, sourceRes] = await Promise.all([
        supabase.rpc('get_bi_counselor_performance', {
          p_start_date: format(currentRange.startDate, 'yyyy-MM-dd'),
          p_end_date: format(currentRange.endDate, 'yyyy-MM-dd')
        }),
        supabase.rpc('get_bi_source_performance', {
          p_start_date: format(currentRange.startDate, 'yyyy-MM-dd'),
          p_end_date: format(currentRange.endDate, 'yyyy-MM-dd')
        })
      ]);

      if (counselorRes.error) throw counselorRes.error;
      if (sourceRes.error) throw sourceRes.error;

      setCounselorData(counselorRes.data || []);
      setSourceData(sourceRes.data || []);
    } catch (error: any) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance analytics');
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
        <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Counselor Performance */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">Counselor Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right">Admissions</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {counselorData.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs">
                        {i + 1}
                      </div>
                      {c.counselor_name}
                    </td>
                    <td className="px-4 py-3 text-right">{c.leads}</td>
                    <td className="px-4 py-3 text-right">{c.admissions}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(c.revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {counselorData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No counselor data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Source Performance */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Lead Source ROI</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium text-right">Leads</th>
                  <th className="px-4 py-3 font-medium text-right">Conv. Rate</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sourceData.map((s, i) => {
                  const convRate = s.leads > 0 ? ((s.admissions / s.leads) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{s.source_name}</td>
                      <td className="px-4 py-3 text-right">{s.leads}</td>
                      <td className="px-4 py-3 text-right">{convRate}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(s.revenue).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
                {sourceData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No source data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
