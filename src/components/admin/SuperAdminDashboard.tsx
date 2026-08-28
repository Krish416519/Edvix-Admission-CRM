import { useEffect, useState } from 'react';
import { 
  Users, Activity, Database, Server, Zap, IndianRupee, FileText, CheckCircle 
} from 'lucide-react';
import { fetchSystemMetrics } from '../../lib/adminService';
import { SystemMetrics } from '../../types/admin';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await fetchSystemMetrics();
        setMetrics(data);
      } catch (error) {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        Loading metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Executive Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time overview of CRM health, usage, and performance.</p>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Leads" value={metrics.totalLeads.toLocaleString()} icon={Users} color="indigo" />
        <MetricCard title="Active Users" value={`${metrics.onlineUsers} / ${metrics.activeUsers}`} icon={Activity} color="emerald" />
        <MetricCard title="Revenue Today" value={`₹${metrics.revenueToday.toLocaleString()}`} icon={IndianRupee} color="amber" />
        <MetricCard title="Admissions Today" value={metrics.admissionsToday.toString()} icon={CheckCircle} color="blue" />
      </div>

      {/* Health & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Today's Usage Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <UsageStat label="AI Requests" value={metrics.aiRequestsToday} />
              <UsageStat label="WhatsApp Msg" value={metrics.whatsappMessagesToday} />
              <UsageStat label="Emails Sent" value={metrics.emailsToday} />
              <UsageStat label="Automations" value={metrics.automationRunsToday} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Pending Backlog
            </h3>
            <div className="flex gap-4">
              <div className="flex-1 bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{metrics.pendingTasks}</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Tasks</div>
              </div>
              <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.pendingPayments}</div>
                <div className="text-xs text-amber-700/70 dark:text-amber-500 mt-1 uppercase tracking-wider font-semibold">Payments</div>
              </div>
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.pendingDocuments}</div>
                <div className="text-xs text-red-700/70 dark:text-red-500 mt-1 uppercase tracking-wider font-semibold">Documents</div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-full">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              System Health
            </h3>
            <div className="space-y-5">
              <HealthRow label="Web Server" status={metrics.serverStatus} icon={Server} />
              <HealthRow label="Database Cluster" status={metrics.databaseStatus} icon={Database} />
              <HealthRow label="API Gateway" status={`${metrics.apiHealth}% Uptime`} icon={Activity} healthy={metrics.apiHealth > 99} />
              
              <div className="pt-4 border-t border-border mt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Storage Capacity</span>
                  <span className="text-sm font-bold text-foreground">{metrics.storageUsedGB} / {metrics.storageTotalGB} GB</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      (metrics.storageUsedGB / metrics.storageTotalGB) > 0.8 ? "bg-red-500" : "bg-primary"
                    )}
                    style={{ width: `${(metrics.storageUsedGB / metrics.storageTotalGB) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/20 transition-colors flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function HealthRow({ label, status, icon: Icon, healthy }: { label: string, status: string, icon: any, healthy?: boolean }) {
  const isHealthy = healthy !== undefined ? healthy : status === 'Operational';
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-md">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", isHealthy ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
        <span className={cn("text-xs font-semibold uppercase tracking-wider", isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
          {status}
        </span>
      </div>
    </div>
  );
}
