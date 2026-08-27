
import { Activity, Search, Filter, ServerCrash, Clock, CheckCircle2 } from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ApiLog } from '../../types/integration';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export function LogsTab() {
  const { logs } = useIntegration();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            API Traffic Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of all inbound requests to the CRM.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium text-muted-foreground">Time</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Source</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Endpoint</th>
              <th className="px-6 py-4 font-medium text-muted-foreground text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {log.status >= 200 && log.status < 300 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ServerCrash className="w-4 h-4 text-red-500" />
                    )}
                    <span className={cn(
                      "font-mono text-xs font-semibold px-2 py-0.5 rounded",
                      log.status >= 200 && log.status < 300 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {log.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">
                  {log.source}
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.ipAddress}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                  <span className="font-bold text-foreground mr-2">{log.method}</span>
                  {log.endpoint}
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3" />
                  {log.responseTimeMs}ms
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No API traffic recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
