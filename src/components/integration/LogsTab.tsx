import { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  ServerCrash,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  X,
  Copy,
  Check,
  Code2,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ApiLog } from '../../types/integration';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function LogsTab() {
  const { logs, refreshAll, clearAllLogs } = useIntegration();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | '2xx' | '4xx' | '5xx'>('All');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        log.endpoint.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        log.ipAddress.toLowerCase().includes(query) ||
        String(log.status).includes(query);

      let matchesStatus = true;
      if (statusFilter === '2xx') matchesStatus = log.status >= 200 && log.status < 300;
      else if (statusFilter === '4xx') matchesStatus = log.status >= 400 && log.status < 500;
      else if (statusFilter === '5xx') matchesStatus = log.status >= 500;

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('API logs refreshed');
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `edvix_api_traffic_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success('Exported API logs to JSON');
  };

  const exportLogsAsCsv = () => {
    const headers = ['Timestamp', 'Status', 'Method', 'Endpoint', 'Source', 'IP Address', 'Response Time (ms)'];
    const rows = logs.map(l => [
      l.timestamp,
      l.status,
      l.method,
      l.endpoint,
      l.source,
      l.ipAddress,
      l.responseTimeMs
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edvix_api_traffic_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported API logs to CSV');
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    setCopiedText(true);
    toast.success('Payload copied');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const successCount = logs.filter(l => l.status >= 200 && l.status < 300).length;
  const clientErrCount = logs.filter(l => l.status >= 400 && l.status < 500).length;
  const serverErrCount = logs.filter(l => l.status >= 500).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-indigo-500/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">API Traffic & Security Logs</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Live Gateway Feed
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Audit inbound lead payloads, verify authentication handshakes, inspect response latencies, and trace webhook delivery statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={exportLogsAsJson}
            className="p-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            title="Export JSON"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={clearAllLogs}
            className="p-2.5 bg-card hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 border border-border rounded-xl text-xs flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by endpoint, source, status, or IP..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setStatusFilter('All')}
            className={cn(
              'px-3 py-1.5 rounded-xl font-semibold border transition-all',
              statusFilter === 'All'
                ? 'bg-foreground text-background border-foreground shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            )}
          >
            All ({logs.length})
          </button>

          <button
            onClick={() => setStatusFilter('2xx')}
            className={cn(
              'px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5',
              statusFilter === '2xx'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-card text-emerald-600 dark:text-emerald-400 border-border hover:border-emerald-500/40'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            2xx Success ({successCount})
          </button>

          <button
            onClick={() => setStatusFilter('4xx')}
            className={cn(
              'px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5',
              statusFilter === '4xx'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-card text-amber-600 dark:text-amber-400 border-border hover:border-amber-500/40'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            4xx Client Error ({clientErrCount})
          </button>

          <button
            onClick={() => setStatusFilter('5xx')}
            className={cn(
              'px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5',
              statusFilter === '5xx'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-card text-rose-600 dark:text-rose-400 border-border hover:border-rose-500/40'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            5xx Server Error ({serverErrCount})
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-5 py-3.5">HTTP Status</th>
                <th className="px-5 py-3.5">Integration Source</th>
                <th className="px-5 py-3.5">Method & Endpoint</th>
                <th className="px-5 py-3.5 text-right">Latency</th>
                <th className="px-5 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map(log => {
                const is2xx = log.status >= 200 && log.status < 300;
                const is4xx = log.status >= 400 && log.status < 500;

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {is2xx ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : is4xx ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <ServerCrash className="w-4 h-4 text-rose-500" />
                        )}
                        <span
                          className={cn(
                            'font-mono text-xs font-bold px-2 py-0.5 rounded-md',
                            is2xx
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : is4xx
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          )}
                        >
                          {log.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-xs text-foreground">{log.source}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{log.ipAddress}</div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">
                      <span
                        className={cn(
                          'font-bold mr-2 text-[10px] px-1.5 py-0.5 rounded border',
                          log.method === 'POST'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : log.method === 'GET'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        )}
                      >
                        {log.method}
                      </span>
                      <span className="text-muted-foreground">{log.endpoint}</span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'font-semibold',
                          log.responseTimeMs < 100
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : log.responseTimeMs < 300
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {log.responseTimeMs}ms
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <span className="text-xs font-semibold text-primary group-hover:underline inline-flex items-center gap-1">
                        Inspect
                        <Code2 className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No API traffic records found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inbound webhook requests and simulator dispatches will appear here in real-time.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LOG INSPECTION DETAIL MODAL                               */}
      {/* ========================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'font-mono text-sm font-bold px-2.5 py-1 rounded-lg',
                    selectedLog.status >= 200 && selectedLog.status < 300
                      ? 'bg-emerald-500 text-white'
                      : selectedLog.status >= 400 && selectedLog.status < 500
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                  )}
                >
                  {selectedLog.status}
                </span>
                <div>
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    {selectedLog.method} {selectedLog.endpoint}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Telemetry metadata */}
              <div className="grid grid-cols-3 gap-3 bg-muted/30 border border-border rounded-xl p-3.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Integration Source</span>
                  <strong className="text-foreground text-sm">{selectedLog.source}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Client IP</span>
                  <strong className="font-mono text-foreground text-sm">{selectedLog.ipAddress}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Server Latency</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {selectedLog.responseTimeMs}ms
                  </strong>
                </div>
              </div>

              {/* Payload Viewer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Request Payload / Telemetry Body
                  </label>
                  <button
                    onClick={() => handleCopyPayload(selectedLog.payload || {})}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedText ? 'Copied' : 'Copy Payload'}
                  </button>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto max-h-64">
                  <pre>{JSON.stringify(selectedLog.payload || { note: 'No body recorded for this call' }, null, 2)}</pre>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="bg-muted/20 border border-border rounded-xl p-3.5 text-xs">
                <span className="font-semibold text-foreground">Diagnostic State: </span>
                <span className="text-muted-foreground">
                  {selectedLog.status === 200 || selectedLog.status === 201
                    ? 'Inbound request was parsed, authenticated, and committed to admissions database without schema violations.'
                    : selectedLog.status === 400
                    ? 'Payload failed validation schema (missing applicant name or contact details).'
                    : selectedLog.status === 401
                    ? 'Unauthorized: Invalid or revoked API key bearer token.'
                    : 'Internal execution exception handled by middleware.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-foreground text-background font-semibold px-4 py-1.5 rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
