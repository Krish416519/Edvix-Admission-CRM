import React, { useState, useEffect } from 'react';
import { Activity, Search, AlertCircle, Info, Trash2, Filter, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function SystemLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error('Failed to load system logs');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all system logs?')) return;
    try {
      const { error } = await supabase
        .from('system_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      if (error) throw error;
      toast.success('System logs cleared');
      fetchLogs();
    } catch (err: any) {
      toast.error('Failed to clear logs');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(search.toLowerCase()) || 
    (l.service || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            System Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track errors, warnings, and system events globally.</p>
        </div>
        <button 
          onClick={handleClearLogs}
          className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear Logs
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-border bg-background rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground">Level</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Source</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Message</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium">
                      {log.level === 'Error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {log.level === 'Warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {log.level === 'Info' && <Info className="w-4 h-4 text-blue-500" />}
                      <span className={cn(
                        log.level === 'Error' ? "text-red-700 dark:text-red-400" :
                        log.level === 'Warning' ? "text-amber-700 dark:text-amber-400" :
                        "text-blue-700 dark:text-blue-400"
                      )}>
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">
                      {log.service || 'System'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{log.message}</div>
                    {log.details && <div className="text-xs text-muted-foreground mt-0.5">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</div>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No system logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
