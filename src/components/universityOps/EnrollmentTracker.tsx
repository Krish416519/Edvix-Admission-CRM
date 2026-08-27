
import { useEnrollmentMilestones } from '../../hooks/useUniversityOps';
import { CheckCircle2, Circle, Clock, Building2, Flag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';

interface EnrollmentTrackerProps {
  submissionId: string;
  admissionId: string;
}

export function EnrollmentTracker({ submissionId, admissionId }: EnrollmentTrackerProps) {
  const { milestones, isLoading, completeMilestone } = useEnrollmentMilestones(submissionId, admissionId);

  const handleComplete = async (milestoneId: string) => {
    try {
      await completeMilestone(milestoneId);
      toast.success('Milestone marked as completed');
    } catch (err: any) {
      toast.error('Failed to complete milestone');
    }
  };

  // Find the index of the first pending milestone to highlight it
  const activeIndex = milestones.findIndex(m => m.status !== 'Completed');

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Enrollment Tracker</h2>
          <p className="text-sm text-muted-foreground mt-1">Track post-admission milestones and student onboarding</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-full">
          <Flag className="w-4 h-4" /> Enrollment Journey
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border -z-10" />

            <div className="space-y-8">
              {milestones.map((milestone, index) => {
                const isCompleted = milestone.status === 'Completed';
                const isActive = index === activeIndex;
                const isPending = !isCompleted && !isActive;

                return (
                  <div key={milestone.id} className={cn(
                    "flex gap-4 relative transition-all",
                    isPending ? "opacity-50 grayscale" : "opacity-100"
                  )}>
                    {/* Status Icon Indicator */}
                    <div className="shrink-0 bg-background relative z-10 pt-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 bg-background rounded-full" />
                      ) : isActive ? (
                        <div className="w-8 h-8 rounded-full border-2 border-primary bg-background flex items-center justify-center relative">
                          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <Circle className="w-8 h-8 text-muted-foreground bg-background rounded-full" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "flex-1 p-4 rounded-xl border transition-all",
                      isActive 
                        ? "border-primary/50 bg-primary/5 shadow-sm" 
                        : isCompleted
                          ? "border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5"
                          : "border-border bg-background"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className={cn(
                            "font-bold text-base",
                            isCompleted ? "text-emerald-700 dark:text-emerald-400" : isActive ? "text-primary" : "text-foreground"
                          )}>
                            {milestone.milestoneName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full border",
                              isCompleted ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20" :
                              isActive ? "bg-primary/10 text-primary border-primary/20" :
                              "bg-muted text-muted-foreground border-border"
                            )}>
                              {milestone.status}
                            </span>
                            {isCompleted && milestone.completedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(milestone.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <button
                            onClick={() => handleComplete(milestone.id)}
                            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Complete
                          </button>
                        )}
                        
                        {isCompleted && (
                          <button className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2">
                            Add Note
                          </button>
                        )}
                      </div>
                      
                      {milestone.notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground italic border border-border">
                          "{milestone.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
