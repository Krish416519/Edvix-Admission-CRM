
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Send, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { useSubmissionQueue } from '../../hooks/useUniversityOps';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

export function UniversityOpsDashboard() {
  const navigate = useNavigate();
  // In a real app we'd want aggregated stats endpoints, but for now we'll fetch some queues
  const { submissions: readyQueue, isLoading: loadingReady } = useSubmissionQueue({ status: 'Ready' });
  const { submissions: submittedQueue, isLoading: loadingSubmitted } = useSubmissionQueue({ status: 'Submitted' });
  const { submissions: airQueue, isLoading: loadingAir } = useSubmissionQueue({ status: 'Additional Information Required' });

  const stats = [
    {
      title: 'Applications Ready',
      value: loadingReady ? '-' : readyQueue.length.toString(),
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      action: () => navigate('/university-ops/queue?status=Ready'),
    },
    {
      title: 'Submitted (Pending)',
      value: loadingSubmitted ? '-' : submittedQueue.length.toString(),
      icon: Send,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      action: () => navigate('/university-ops/queue?status=Submitted'),
    },
    {
      title: 'Under Review',
      value: '24', // Mocked for now
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      action: () => navigate('/university-ops/queue?status=Under Review'),
    },
    {
      title: 'Info Required (AIR)',
      value: loadingAir ? '-' : airQueue.length.toString(),
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      action: () => navigate('/university-ops/queue?status=Additional Information Required'),
    },
    {
      title: 'Approved (This Month)',
      value: '45', // Mock
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Rejected (This Month)',
      value: '3', // Mock
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Overdue / SLA Breach',
      value: '2', // Mock
      icon: AlertTriangle,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      action: () => navigate('/university-ops/sla'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">University Operations Hub</h1>
          <p className="text-muted-foreground mt-1">Manage submissions, responses, and university SLAs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={cn("p-3 rounded-lg", stat.bgColor, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.action && (
                <button 
                  onClick={stat.action}
                  className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1">{stat.title}</p>
            </div>
            
            {/* Decorative background element */}
            <div className={cn(
              "absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 duration-500",
              stat.bgColor.replace('/10', '') // use solid color for background shape
            )} />
          </div>
        ))}
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
           <h2 className="text-lg font-bold text-foreground mb-4">Pending Submissions Queue</h2>
           {loadingReady ? (
             <div className="space-y-3">
               <Skeleton className="h-16 w-full rounded-lg" />
               <Skeleton className="h-16 w-full rounded-lg" />
               <Skeleton className="h-16 w-full rounded-lg" />
             </div>
           ) : readyQueue.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                <p>No pending submissions.</p>
             </div>
           ) : (
             <div className="space-y-3">
               {readyQueue.slice(0, 5).map(sub => (
                 <div key={sub.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:border-primary/30 transition-colors">
                   <div>
                     <p className="font-medium text-foreground text-sm">{sub.studentName}</p>
                     <p className="text-xs text-muted-foreground">{sub.universityName} • {sub.courseName}</p>
                   </div>
                   <button 
                    onClick={() => navigate(`/university-ops/queue?id=${sub.id}`)}
                    className="text-xs font-medium text-primary hover:underline"
                   >
                     Process
                   </button>
                 </div>
               ))}
               {readyQueue.length > 5 && (
                 <button onClick={() => navigate('/university-ops/queue?status=Ready')} className="w-full text-center text-sm text-primary font-medium mt-2 hover:underline">
                   View all {readyQueue.length}
                 </button>
               )}
             </div>
           )}
        </div>
        
        <div className="p-6 bg-card border border-border rounded-xl shadow-sm">
           <h2 className="text-lg font-bold text-foreground mb-4">SLA Watchlist</h2>
           <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>SLA tracking data will appear here.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
