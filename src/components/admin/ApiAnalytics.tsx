import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Server, Clock, AlertTriangle, CheckCircle2, XCircle, Webhook, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  requests_today: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_ms: number;
  rate_limit_hits: number;
  webhook_deliveries: number;
  failed_webhooks: number;
  traffic_by_source: { source: string; requests: number }[];
}

export function ApiAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: rawData, error } = await supabase.rpc('get_api_analytics');
      if (error) throw error;
      
      setData(rawData as AnalyticsData);
    } catch (error) {
      console.error('Failed to load API analytics:', error);
      toast.error('Failed to load API analytics');
      // Set some dummy data if the DB is completely empty just so the UI looks nice for the demo
      setData({
        requests_today: 0,
        successful_requests: 0,
        failed_requests: 0,
        avg_response_ms: 0,
        rate_limit_hits: 0,
        webhook_deliveries: 0,
        failed_webhooks: 0,
        traffic_by_source: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
        <Activity className="w-8 h-8 mb-4 animate-pulse text-primary/50" />
        <p>Crunching API logs...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="API Requests Today" 
          value={data.requests_today.toLocaleString()} 
          icon={<Server className="w-5 h-5 text-blue-500" />}
          bgColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <MetricCard 
          title="Successful Requests" 
          value={data.successful_requests.toLocaleString()} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          bgColor="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <MetricCard 
          title="Failed Requests" 
          value={data.failed_requests.toLocaleString()} 
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          bgColor="bg-red-50 dark:bg-red-500/10"
        />
        <MetricCard 
          title="Average Response" 
          value={`${data.avg_response_ms}ms`} 
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          bgColor="bg-indigo-50 dark:bg-indigo-500/10"
        />
      </div>

      {/* Second Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Rate Limit Hits" 
          value={data.rate_limit_hits.toLocaleString()} 
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          bgColor="bg-amber-50 dark:bg-amber-500/10"
        />
        <MetricCard 
          title="Webhook Deliveries" 
          value={data.webhook_deliveries.toLocaleString()} 
          icon={<Webhook className="w-5 h-5 text-fuchsia-500" />}
          bgColor="bg-fuchsia-50 dark:bg-fuchsia-500/10"
        />
        <MetricCard 
          title="Failed Webhooks" 
          value={data.failed_webhooks.toLocaleString()} 
          icon={<XCircle className="w-5 h-5 text-rose-500" />}
          bgColor="bg-rose-50 dark:bg-rose-500/10"
        />
      </div>

      {/* Traffic Sources Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Traffic by Integration</h2>
        </div>
        
        {data.traffic_by_source && data.traffic_by_source.length > 0 ? (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Integration Source</th>
                <th className="px-6 py-4 text-right">Requests Today</th>
                <th className="px-6 py-4 w-1/3">Traffic Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.traffic_by_source.map((source, idx) => {
                const maxRequests = Math.max(...data.traffic_by_source.map(s => s.requests));
                const percentage = maxRequests > 0 ? (source.requests / maxRequests) * 100 : 0;
                
                return (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{source.source}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                      {source.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No traffic recorded yet today.</p>
            <p className="text-sm mt-1">Make API requests to see integration traffic data here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, bgColor }: { title: string, value: string, icon: React.ReactNode, bgColor: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
