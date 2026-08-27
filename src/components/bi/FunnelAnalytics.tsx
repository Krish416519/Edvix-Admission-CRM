import { useEffect, useState } from 'react';
import { useBI } from '../../contexts/BIContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Loader2, Filter, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export function FunnelAnalytics() {
  const { currentRange } = useBI();
  const [loading, setLoading] = useState(true);
  const [funnelData, setFunnelData] = useState<any>(null);

  useEffect(() => {
    fetchFunnelData();
  }, [currentRange]);

  const fetchFunnelData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_bi_funnel_leakage', {
        p_start_date: format(currentRange.startDate, 'yyyy-MM-dd'),
        p_end_date: format(currentRange.endDate, 'yyyy-MM-dd')
      });

      if (error) throw error;
      setFunnelData(data);
    } catch (error: any) {
      console.error('Error fetching funnel data:', error);
      toast.error('Failed to load funnel analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  // Transform data for charts
  const chartData = [
    { name: 'Leads', value: funnelData?.leads || 0, drop: 0 },
    { name: 'Contacted', value: funnelData?.contacted || 0, drop: funnelData?.drop_off?.lead_to_contact || 0 },
    { name: 'Qualified', value: funnelData?.qualified || 0, drop: funnelData?.drop_off?.contact_to_qual || 0 },
    { name: 'Applications', value: funnelData?.applications || 0, drop: funnelData?.drop_off?.qual_to_app || 0 },
    { name: 'Admissions', value: funnelData?.admissions || 0, drop: funnelData?.drop_off?.app_to_adm || 0 },
    { name: 'Payments', value: funnelData?.payments || 0, drop: funnelData?.drop_off?.adm_to_pay || 0 }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Funnel & Leakage Analytics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Funnel Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" /> Conversion Funnel
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontWeight={500} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-primary text-lg font-bold">{data.value.toLocaleString()}</p>
                          {data.drop > 0 && (
                            <p className="text-red-500 text-xs mt-1">↓ {data.drop}% drop-off from previous</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leakage Analysis */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" /> Key Leakage Points
          </h3>
          <div className="flex-1 space-y-4">
            {chartData.map((stage, idx) => {
              if (idx === 0) return null; // Skip first stage
              if (stage.drop < 10) return null; // Only show significant drop-offs
              
              const prevStage = chartData[idx - 1];
              
              return (
                <div key={stage.name} className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    {prevStage.name} <ArrowRight className="w-4 h-4" /> {stage.name}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stage.drop}%</p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70">Drop-off rate</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{prevStage.value - stage.value} leads</p>
                      <p className="text-xs text-muted-foreground">Lost in transition</p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {chartData.every((s, i) => i === 0 || s.drop < 10) && (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No significant leakage points detected (&gt;10% drop-off) in the selected period.</p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
