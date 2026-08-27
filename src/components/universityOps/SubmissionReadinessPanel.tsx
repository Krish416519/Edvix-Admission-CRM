
import { useSubmissionReadiness } from '../../hooks/useUniversityOps';
import { CheckCircle, XCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/Skeleton';

interface SubmissionReadinessPanelProps {
  admissionId: string | null;
  onProceed: () => void;
}

export function SubmissionReadinessPanel({ admissionId, onProceed }: SubmissionReadinessPanelProps) {
  const readiness = useSubmissionReadiness(admissionId);

  if (!admissionId) {
    return (
      <div className="p-6 bg-card border border-border rounded-xl text-center">
        <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Select an application to check readiness</p>
      </div>
    );
  }

  // If score is 0 and no checks are there, it's likely loading
  if (readiness.checks.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-xl space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className={cn(
        "p-6 border-b",
        readiness.passed ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" 
                         : "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
            readiness.passed ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" 
                             : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
          )}>
            {readiness.passed ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {readiness.passed ? 'Ready for Submission' : 'Not Ready for Submission'}
            </h2>
            <p className="text-sm font-medium mt-1 opacity-90">
              Readiness Score: {readiness.score}%
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Checklist</h3>
        <div className="space-y-3">
          {readiness.checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {check.passed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  check.passed ? "text-foreground" : "text-red-600 dark:text-red-400"
                )}>
                  {check.label}
                </p>
                {check.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!readiness.passed && readiness.blockers.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" /> Blockers to resolve
            </h4>
            <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 space-y-1">
              {readiness.blockers.map((blocker, idx) => (
                <li key={idx}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
        <button
          onClick={onProceed}
          disabled={!readiness.passed}
          className={cn(
            "px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all",
            readiness.passed 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md" 
              : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
          )}
        >
          Proceed to Submission <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
