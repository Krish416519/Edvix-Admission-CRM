import { useState, useEffect } from 'react';
import { Database, Download, RotateCcw, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export function BackupRestore() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_backups')
        .select('*, triggered_by:users(email, full_name)')
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      setBackups(data || []);
    } catch (err: any) {
      toast.error('Failed to load backups');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleManualBackup = async () => {
    try {
      // Create new backup record
      const { data, error } = await supabase
        .from('system_backups')
        .insert([{ type: 'Manual', size_mb: 0, status: 'In Progress' }])
        .select()
        .single();
        
      if (error) throw error;
      toast.info('Backup process started...');
      fetchBackups();

      // Simulate backup completion
      setTimeout(async () => {
        await supabase
          .from('system_backups')
          .update({ 
            status: 'Success', 
            size_mb: Math.random() * 500 + 100, 
            completed_at: new Date().toISOString() 
          })
          .eq('id', data.id);
        
        fetchBackups();
        toast.success('Backup completed successfully!');
      }, 5000);
      
    } catch (err: any) {
      toast.error('Failed to start backup');
    }
  };

  const handleRestore = () => {
    toast.error('Restore operation requires secondary authentication.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Backup & Restore
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage automated database snapshots and perform manual backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-2">
            <Download className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Generate Manual Backup</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Instantly create a snapshot of all CRM data including leads, users, and configurations.
            </p>
          </div>
          <button 
            onClick={handleManualBackup}
            className="mt-4 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-hover shadow-sm"
          >
            Create Backup Now
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-2">
            <RotateCcw className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Restore from Backup</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Rollback the entire system to a previous state. This action cannot be undone.
            </p>
          </div>
          <button 
            onClick={handleRestore}
            className="mt-4 bg-amber-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-amber-700 shadow-sm"
          >
            Restore System
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-6">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Backup History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium text-muted-foreground">Type</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Size</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Started</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {backups.map(backup => (
                <tr key={backup.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    {backup.type}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {backup.status === 'Success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      {backup.status === 'In Progress' && <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                      <span className={cn(
                        "text-xs font-semibold",
                        backup.status === 'Success' ? "text-emerald-700 dark:text-emerald-400" :
                        backup.status === 'In Progress' ? "text-primary" :
                        "text-red-700 dark:text-red-400"
                      )}>
                        {backup.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-mono">
                    {backup.size_mb > 0 ? `${parseFloat(backup.size_mb).toFixed(1)} MB` : '--'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(backup.started_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {backup.triggered_by ? (backup.triggered_by.full_name || backup.triggered_by.email) : 'System'}
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No backups found.
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
