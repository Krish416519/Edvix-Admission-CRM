import { useEffect, useState } from 'react';
import { Database, Shield, Wifi, WifiOff, Server, Key, User, Activity, HardDrive, Cpu, Zap, LogOut, Clock, AlertTriangle, MessageSquare, Mail, Users } from 'lucide-react';
import { supabase, hasSupabaseKeys, checkSupabaseConnection } from '../../lib/supabase';
import { useOperations } from '../../hooks/useOperations';

export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  
  const { health, metrics, loading, refresh, error } = useOperations();

  useEffect(() => {
    const verifyConnection = async () => {
      setStatus('checking');
      
      const { connected, error } = await checkSupabaseConnection();
      
      if (connected) {
        setStatus('connected');
        // Fetch current session if connected
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } else {
        setStatus('disconnected');
        setErrorMsg(error);
      }
    };

    verifyConnection();
  }, []);

  const handleRefresh = () => {
    setStatus('checking');
    checkSupabaseConnection().then(({ connected, error }) => {
      if (connected) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
        setErrorMsg(error);
      }
    });
    refresh();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Production Operations Center</h1>
          <p className="text-muted-foreground mt-1">Live telemetry, system health, and operation metrics.</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading || status === 'checking'}
          className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg shadow-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {loading || status === 'checking' ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Error Display */}
        {error && (
          <div className="col-span-1 lg:col-span-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Failed to load operations data</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Core Connection Status */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col col-span-1 lg:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Core Connection</h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            {status === 'checking' && (
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wifi className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-lg font-medium text-foreground">Verifying...</p>
              </div>
            )}

            {status === 'connected' && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Wifi className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-medium text-emerald-500">Connected</p>
                <p className="text-sm text-muted-foreground mt-1 text-center">Supabase backend is online</p>
              </div>
            )}

            {status === 'disconnected' && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                  <WifiOff className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-lg font-medium text-red-500">Disconnected</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{errorMsg}</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Active Users</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.activeUsers || 0}</div>
            <div className="text-xs text-emerald-500 mt-1">{metrics?.onlineUsers || 0} online now</div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">API Requests</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.apiRequests || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Today</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">API Errors</span>
            </div>
            <div className="text-2xl font-bold text-red-500">{metrics?.failedApiRequests || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Today</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.avgResponseTime || 0}ms</div>
            <div className="text-xs text-emerald-500 mt-1">Optimal</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">DB Queries</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.dbQueries || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Estimated Today</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm font-medium">Storage</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.storageUsedGB || 0}GB</div>
            <div className="text-xs text-emerald-500 mt-1">Used</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm font-medium">Host CPU</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.cpuUsage || 0}%</div>
            <div className="text-xs text-emerald-500 mt-1">Healthy</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Server className="w-4 h-4" />
              <span className="text-sm font-medium">Host Memory</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.memoryUsage || 0}%</div>
            <div className="text-xs text-emerald-500 mt-1">Healthy</div>
          </div>
        </div>

        {/* System Services Health */}
        <div className="col-span-1 lg:col-span-3 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Service Health</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Supabase Services */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Infrastructure</h3>
              <ServiceStatusItem label="Database Engine" status={health?.database || 'Unknown'} icon={<Database className="w-4 h-4" />} />
              <ServiceStatusItem label="Authentication (GoTrue)" status={health?.auth || 'Unknown'} icon={<Shield className="w-4 h-4" />} />
              <ServiceStatusItem label="Storage" status={health?.storage || 'Unknown'} icon={<HardDrive className="w-4 h-4" />} />
              <ServiceStatusItem label="Edge Functions" status={health?.edgeFunctions || 'Unknown'} icon={<Server className="w-4 h-4" />} />
            </div>

            {/* Application Services */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Application</h3>
              <ServiceStatusItem label="API Gateway" status={health?.api || 'Unknown'} icon={<Activity className="w-4 h-4" />} />
              <ServiceStatusItem label="Background Queue" status={health?.queue || 'Unknown'} icon={<Clock className="w-4 h-4" />} />
              <ServiceStatusItem label="Webhook Dispatcher" status={health?.webhooks || 'Unknown'} icon={<Zap className="w-4 h-4" />} />
            </div>

            {/* External Integrations */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">External Providers</h3>
              <ServiceStatusItem label="Email Delivery (Resend)" status={health?.emailProvider || 'Unknown'} icon={<Mail className="w-4 h-4" />} />
              <ServiceStatusItem label="WhatsApp API (Meta)" status={health?.whatsappProvider || 'Unknown'} icon={<MessageSquare className="w-4 h-4" />} />
              <ServiceStatusItem label="AI Engine (OpenAI)" status={health?.aiProvider || 'Unknown'} icon={<Cpu className="w-4 h-4" />} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ServiceStatusItem({ label, status, icon }: { label: string, status: string, icon: React.ReactNode }) {
  const isHealthy = status === 'Operational';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
        <span className={`text-xs font-medium ${isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
