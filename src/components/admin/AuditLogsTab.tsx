import { useState, useEffect } from 'react';
import { Search, Shield, Database, Activity, Filter, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function AuditLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error('Failed to load audit logs');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    (l.actor_name_snapshot || '').toLowerCase().includes(search.toLowerCase()) || 
    (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          Immutable Audit Trail
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Historical record of all entity changes, preserving actor snapshots regardless of user status.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by actor, action, or entity..." 
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
                <th className="px-6 py-4 font-medium text-muted-foreground">Actor (Snapshot)</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Action</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Entity</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Changes</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{log.actor_name_snapshot}</span>
                      <span className="text-xs text-muted-foreground">{log.actor_role_snapshot}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{log.entity_type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{log.entity_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] truncate text-xs text-muted-foreground cursor-help" title={JSON.stringify({ old: log.old_values, new: log.new_values })}>
                      {log.new_values ? 'Updated' : 'Created/Deleted'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No audit logs found.
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
