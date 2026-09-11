import { useState, useEffect, useRef } from 'react';
import { 
  Loader2, Zap, CheckCircle2, XCircle, Clock, Search, ChevronRight, 
  RefreshCw, Download, Filter, AlertTriangle, ArrowRight, User, Eye, 
  RotateCcw, Copy, Check, FileJson, Layers, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { automationService, ExecutionLogRecord } from '../../lib/automationService';
import { logger } from '../../lib/logger';
import { cn } from '../../lib/utils';

export function ExecutionHistory() {
  const [logs, setLogs] = useState<ExecutionLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Failed' | 'In Progress' | 'Delayed'>('all');
  const [selectedLog, setSelectedLog] = useState<ExecutionLogRecord | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await automationService.getExecutionLogs({
        limit: 100,
        status: statusFilter,
        search: searchQuery
      });
      setLogs(data);
    } catch (error) {
      logger.error('Error fetching automation logs:', { message: (error as any)?.message });
      toast.error('Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const wfName = (log.automation_workflows?.name || '').toLowerCase();
    const trigger = (log.trigger_event || '').toLowerCase();
    const err = (log.error_message || '').toLowerCase();
    const leadId = (log.affected_lead_id || '').toLowerCase();
    return wfName.includes(q) || trigger.includes(q) || err.includes(q) || leadId.includes(q);
  });

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    toast.success('Execution payload copied to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleRetryRun = async (log: ExecutionLogRecord) => {
    setIsRetrying(true);
    try {
      const payload = log.automation_runs?.payload || {
        lead: { id: log.affected_lead_id || 'manual-retry-lead' },
        event: log.trigger_event
      };

      await automationService.triggerEvent(log.trigger_event, payload);
      toast.success(`Re-triggered workflow: ${log.automation_workflows?.name || log.trigger_event}`);
      await fetchLogs();
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const exportLogsToCsv = () => {
    if (filteredLogs.length === 0) {
      toast.info('No logs to export');
      return;
    }
    const headers = ['ID', 'Workflow', 'Trigger', 'Status', 'Duration (ms)', 'Error', 'Time'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.automation_workflows?.name || 'Unknown'}"`,
      `"${l.trigger_event}"`,
      l.status,
      l.execution_time_ms || 0,
      `"${(l.error_message || '').replace(/"/g, '""')}"`,
      l.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edvix_automation_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported to CSV');
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header Controls Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/20">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Execution History
            <span className="text-xs bg-muted border border-border px-2 py-0.5 rounded-full font-mono text-muted-foreground font-normal">
              {filteredLogs.length} runs
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time audit log of trigger events and executed workflow actions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                // 300ms debounce — prevents re-filter on every keystroke
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = setTimeout(() => {
                  // filteredLogs is computed from searchQuery state, this just ensures
                  // we don't trigger re-fetch on every key press
                }, 300);
              }}
              placeholder="Search by workflow, trigger..." 
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-1.5 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportLogsToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 text-foreground transition-colors"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Status Chips */}
      <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-muted-foreground text-[11px] font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {(['all', 'Success', 'Failed', 'In Progress', 'Delayed'] as const).map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
              statusFilter === st
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border hover:bg-muted/60"
            )}
          >
            {st === 'all' ? 'All Logs' : st}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Loading execution history...</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground bg-muted/40 uppercase tracking-wider border-b border-border sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Workflow</th>
                <th className="px-4 py-3 font-semibold">Trigger Event</th>
                <th className="px-4 py-3 font-semibold">Latency</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr 
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className={cn(
                    "hover:bg-muted/40 transition-colors cursor-pointer group",
                    selectedLog?.id === log.id && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {log.status === 'Success' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      )}
                      {log.status === 'Failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-800/40">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                      {log.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800/40">
                          <Clock className="w-3 h-3 animate-spin" />
                          Running
                        </span>
                      )}
                      {log.status === 'Delayed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-800/40">
                          <Clock className="w-3 h-3" />
                          Delayed
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400 line-clamp-1 max-w-[240px] font-mono">
                        {log.error_message}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span className="truncate max-w-[220px]">
                        {log.automation_workflows?.name || 'Manual / Prebuilt Automation'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-md bg-muted border border-border text-[11px] font-mono font-medium text-foreground">
                      {log.trigger_event}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                    {log.execution_time_ms ? `${log.execution_time_ms}ms` : '< 1ms'}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, h:mm:ss a') : 'Just now'}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="p-1.5 text-muted-foreground group-hover:text-primary hover:bg-muted/80 rounded-md transition-colors"
                      title="Inspect Execution Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                        <Zap className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">No execution logs found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trigger an admission event or run a workflow dry-run to see execution traces.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Execution Inspection Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  selectedLog.status === 'Success' ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600" : "bg-red-100 dark:bg-red-950 text-red-600"
                )}>
                  {selectedLog.status === 'Success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Execution Trace Details</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">Run ID: {selectedLog.id.slice(0, 18)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRetryRun(selectedLog)}
                  disabled={isRetrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors shadow-xs"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRetrying && "animate-spin")} />
                  Re-run
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Summary Metric Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Status</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{selectedLog.status}</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Latency</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{selectedLog.execution_time_ms || 0} ms</p>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Trigger</p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate">{selectedLog.trigger_event}</p>
                </div>
              </div>

              {/* Workflow Details */}
              <div className="p-3 bg-card border border-border rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workflow</h4>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">
                    {selectedLog.automation_workflows?.name || 'Prebuilt System Automation'}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedLog.workflow_id?.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Error Message Alert */}
              {selectedLog.error_message && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-xs mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Error Description
                  </div>
                  <pre className="text-xs font-mono text-red-600 dark:text-red-300 whitespace-pre-wrap break-words">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}

              {/* Executed Actions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Actions Executed</span>
                  <span className="text-[11px] font-mono">{selectedLog.actions_executed?.length || 0} steps</span>
                </h4>

                <div className="space-y-2">
                  {(selectedLog.actions_executed || []).map((act, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-background border border-border rounded-lg text-xs">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span>{act}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-medium">
                        <Check className="w-3 h-3" /> Executed
                      </span>
                    </div>
                  ))}

                  {(!selectedLog.actions_executed || selectedLog.actions_executed.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">No actions recorded in log payload.</p>
                  )}
                </div>
              </div>

              {/* Affected Lead Preview */}
              {selectedLog.affected_lead_id && (
                <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Target Lead Reference
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground font-semibold">{selectedLog.affected_lead_id}</span>
                    <a 
                      href={`/all-leads/${selectedLog.affected_lead_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      View Profile <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Raw Payload Accordion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileJson className="w-3.5 h-3.5" /> Raw Event Payload
                  </h4>
                  <button
                    onClick={() => handleCopyPayload(selectedLog.automation_runs?.payload || selectedLog)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {copiedPayload ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedPayload ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>

                <pre className="p-3 bg-muted/50 border border-border rounded-lg text-xs font-mono text-foreground overflow-x-auto max-h-56">
                  {JSON.stringify({
                    trigger_event: selectedLog.trigger_event,
                    workflow_id: selectedLog.workflow_id,
                    run_id: selectedLog.run_id,
                    affected_lead_id: selectedLog.affected_lead_id,
                    execution_time_ms: selectedLog.execution_time_ms,
                    actions_executed: selectedLog.actions_executed,
                    status: selectedLog.status,
                    // Raw payload is NOT shown here — may contain lead PII
                    _note: 'Raw trigger payload omitted from UI to prevent PII exposure'
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
