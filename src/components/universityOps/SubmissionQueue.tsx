import { useState } from 'react';
import { useSubmissionQueue } from '../../hooks/useUniversityOps';
import { 
  Search, 
  ChevronRight, 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Building2,
  ExternalLink,
  Inbox
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';


export function SubmissionQueue() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const { submissions, isLoading } = useSubmissionQueue({ 
    status: statusFilter === 'All' ? undefined : statusFilter 
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Draft': return { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', icon: FileText };
      case 'Ready': return { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', icon: CheckCircle };
      case 'Submitted': return { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', icon: ExternalLink };
      case 'Received': return { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle };
      case 'Under Review': return { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', icon: Clock };
      case 'Additional Information Required': return { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', icon: AlertCircle };
      case 'Approved': return { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle };
      case 'Rejected': return { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', icon: AlertCircle };
      default: return { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', icon: FileText };
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return sub.studentName?.toLowerCase().includes(term) || 
           sub.universityName?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submission Queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track university applications</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student or university..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all appearance-none text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Ready">Ready</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Additional Information Required">Info Required</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student & Application</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">University & Program</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Counselor</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status & SLA</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-10 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyState
                      icon={Inbox}
                      title="No submissions found"
                      description={searchTerm ? "Try adjusting your search or filters" : "Your submission queue is currently empty"}
                    />
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const statusConf = getStatusConfig(sub.status);
                  const StatusIcon = statusConf.icon;
                  
                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{sub.studentName || 'Unknown Student'}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">ID: {sub.id.substring(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 text-primary rounded-md shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm line-clamp-1">{sub.universityName}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1">{sub.courseName || 'No Program Selected'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {sub.counselorName?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-muted-foreground">{sub.counselorName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusConf.bg, statusConf.text)}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {sub.status}
                          </span>
                          {sub.slaStatus === 'Overdue' || sub.slaStatus === 'Breached' ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> SLA BREACH
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">SLA: {sub.slaStatus}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-background border border-transparent hover:border-border rounded-md text-muted-foreground hover:text-foreground transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
