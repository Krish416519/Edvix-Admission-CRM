import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Zap, CheckCircle2, XCircle, Clock, Search, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function ExecutionHistory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_execution_logs')
        .select(`
          id, status, error_message, created_at, trigger_event,
          automation_workflows ( name ),
          automation_runs ( current_step, status )
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching automation logs:', error);
      toast.error('Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Execution History
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              className="pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background w-64 text-foreground"
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Workflow</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {log.status === 'Success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {log.status === 'Failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    {log.status === 'In Progress' && <Clock className="w-4 h-4 text-blue-500" />}
                    {log.status === 'Delayed' && <Clock className="w-4 h-4 text-indigo-500" />}
                    
                    <span className="font-medium text-xs">{log.status}</span>
                  </div>
                  {log.error_message && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400 line-clamp-1 max-w-[200px]">
                      {log.error_message}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {log.automation_workflows?.name || 'Unknown Workflow'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-medium font-mono">
                    {log.trigger_event}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {format(new Date(log.created_at), 'MMM d, h:mm a')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No execution logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
