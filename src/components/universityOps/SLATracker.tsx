import { useState } from 'react';
import { useSLAs } from '../../hooks/useUniversityOps';
import { Clock, AlertTriangle, CheckCircle, ShieldAlert, Settings, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export function SLATracker() {
  const { slas, isLoading } = useSLAs();
  const [selectedUniversity, setSelectedUniversity] = useState<string>('All');

  const filteredSLAs = selectedUniversity === 'All' 
    ? slas 
    : slas.filter(s => s.universityId === selectedUniversity);

  // Derive unique universities for filter
  const universities = Array.from(new Set(slas.filter(s => s.universityId).map(s => s.universityId)));

  const formatEventName = (event: string) => {
    return event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SLA Tracker</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor Service Level Agreements across university partners</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="pl-3 pr-8 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all appearance-none text-foreground"
          >
            <option value="All">All Universities (Global)</option>
            {/* If we had full university names we'd use them, but we only have IDs in this view right now unless we fetch them */}
            {universities.map(u => (
              <option key={u as string} value={u as string}>University {(u as string).substring(0, 8)}...</option>
            ))}
          </select>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-background border border-input text-foreground rounded-lg hover:bg-muted transition-colors shadow-sm whitespace-nowrap text-sm font-medium">
            <Settings className="w-4 h-4" /> Configure SLAs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">On Time</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">85%</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">↑ 2% from last week</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Due Soon</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">12</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Require action today</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Overdue</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">5</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">Past SLA deadline</p>
        </div>
        
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-muted-foreground">Escalated</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">2</p>
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Manager notified</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Configured SLA Rules</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20" /></td>
                  </tr>
                ))
              ) : filteredSLAs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12">
                    <EmptyState
                      icon={Clock}
                      title="No SLAs configured"
                      description="Set up SLA rules to automatically track submission and response times."
                    />
                  </td>
                </tr>
              ) : (
                filteredSLAs.map((sla) => (
                  <tr key={sla.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      {sla.universityId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          <Building2 className="w-3.5 h-3.5" /> Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400">
                          <Globe className="w-3.5 h-3.5" /> Global Default
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground text-sm">
                      {formatEventName(sla.eventType)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-foreground">{sla.slaHours} Hours</span>
                      <span className="text-xs text-muted-foreground ml-2">({Math.round(sla.slaHours / 24)} days)</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                        sla.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        {sla.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Minimal placeholder since globe wasn't imported from lucide
function Globe(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>;
}
