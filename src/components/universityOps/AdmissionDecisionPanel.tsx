import { useState } from 'react';
import { useUniversityOpsActions, UniversitySubmission } from '../../hooks/useUniversityOps';
import { ShieldCheck, Calendar, FileText, CheckCircle2, XCircle, AlertCircle, Clock, Link, Save, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface AdmissionDecisionPanelProps {
  submission: UniversitySubmission;
  onComplete: () => void;
}

const DECISION_TYPES = [
  { id: 'Approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'Conditionally Approved', label: 'Conditional', icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'Waitlisted', label: 'Waitlisted', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'Deferred', label: 'Deferred', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'Rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  { id: 'Withdrawn', label: 'Withdrawn', icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
];

export function AdmissionDecisionPanel({ submission, onComplete }: AdmissionDecisionPanelProps) {
  const { user, userRole } = useAuth();
  const { recordDecision } = useUniversityOpsActions();
  
  const [decision, setDecision] = useState('');
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState('University Email');
  const [reference, setReference] = useState('');
  const [conditions, setConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RBAC Check
  const canMakeDecision = userRole === 'Admin' || userRole === 'Super Admin' || userRole === 'University Operations Manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canMakeDecision) {
      toast.error('You do not have permission to record admission decisions.');
      return;
    }
    if (!decision) {
      toast.error('Please select a decision outcome.');
      return;
    }
    if (decision === 'Conditionally Approved' && !conditions.trim()) {
      toast.error('Please specify the conditions for approval.');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordDecision({
        submissionId: submission.id,
        admissionId: submission.admissionId,
        decision,
        decisionDate,
        source,
        reference: reference.trim() || undefined,
        conditions: conditions.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Admission decision (${decision}) recorded successfully.`);
      onComplete();
    } catch (err: any) {
      console.error('[AdmissionDecisionPanel]', err);
      toast.error(err.message || 'Failed to record decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canMakeDecision) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-center">
        <ShieldAlert className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-red-900 dark:text-red-400">Access Denied</h3>
        <p className="text-red-700 dark:text-red-300 mt-2 text-sm max-w-md mx-auto">
          Recording formal admission decisions is restricted to Admins and University Operations Managers. 
          Partners and Counselors cannot modify this official record.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Record Official Decision</h2>
          <p className="text-sm text-muted-foreground mt-1">Record the final outcome from the university</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" /> Official Record
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Decision Grid */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">Decision Outcome *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DECISION_TYPES.map(type => {
              const isSelected = decision === type.id;
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setDecision(type.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 border rounded-xl text-center transition-all",
                    isSelected 
                      ? type.bg + ' ring-2 ring-primary/50' 
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <Icon className={cn("w-6 h-6 mb-2", isSelected ? type.color : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", isSelected ? type.color : "text-foreground")}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Date of Decision *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Source of Decision *</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              required
            >
              <option value="University Email">University Email</option>
              <option value="University Portal">University Portal</option>
              <option value="API Integration">API Integration</option>
              <option value="Physical Letter">Physical Letter</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Reference / Letter Number</label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. ADM-2026-9912"
              className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            />
          </div>
        </div>

        {decision === 'Conditionally Approved' && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Conditions for Final Approval <span className="text-red-500">*</span>
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Must submit final semester marksheets, Score 6.5 in IELTS..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground min-h-[80px]"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Internal Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any internal context..."
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground min-h-[80px]"
          />
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !decision}
            className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Official Decision
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
