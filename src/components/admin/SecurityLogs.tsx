import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Search, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function SecurityLogs() {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      toast.error('Failed to load security logs');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({ status: 'Resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Security event resolved');
      fetchEvents();
    } catch (err: any) {
      toast.error('Failed to resolve event');
    }
  };

  const filteredEvents = events.filter(e => 
    (e.user_email || '').toLowerCase().includes(search.toLowerCase()) || 
    (e.ip_address || '').includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Security Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Monitor failed logins, suspicious activity, and audit logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800 dark:text-red-300">Active Threats</h4>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
              {events.filter(e => e.status !== 'Resolved').length}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Resolved</h4>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {events.filter(e => e.status === 'Resolved').length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by IP or User..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground">Type</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">User / IP</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Location</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Time</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-4 font-medium text-right text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvents.map(event => (
                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium">
                      {event.type === 'Failed Login' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {event.type === 'Suspicious IP' && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                      {event.type === 'Role Changed' && <Info className="w-4 h-4 text-blue-500" />}
                      {event.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{event.user_email || 'Unknown'}</div>
                    <div className="font-mono text-xs text-muted-foreground">{event.ip_address}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {event.location || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold uppercase",
                      event.status === 'Resolved' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      event.status === 'Blocked' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {event.status !== 'Resolved' && (
                      <button 
                        onClick={() => handleResolve(event.id)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No security events found.
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
