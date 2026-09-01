import { useState } from 'react';
import { useUniversityOpsActions, UniversitySubmission } from '../../hooks/useUniversityOps';
import { Globe, Mail, Link, Send, ShieldCheck, FileKey, Terminal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface SubmissionWorkflowProps {
  submission: UniversitySubmission;
  onComplete: () => void;
  onCancel: () => void;
}

const SUBMISSION_METHODS = [
  { id: 'Manual Portal', name: 'Manual Portal', icon: Globe, desc: 'Submit via university web portal' },
  { id: 'University API', name: 'API Integration', icon: Terminal, desc: 'Direct system-to-system submission' },
  { id: 'Email', name: 'Email Submission', icon: Mail, desc: 'Send application package via email' },
  { id: 'Webhook', name: 'Webhook', icon: Link, desc: 'Trigger external webhook' },
];

export function SubmissionWorkflow({ submission, onComplete, onCancel }: SubmissionWorkflowProps) {
  const { submitToUniversity, recordReference } = useUniversityOpsActions();
  const [method, setMethod] = useState(submission.submissionMethod || 'Manual Portal');
  const [referenceType, setReferenceType] = useState('Application Number');
  const [referenceValue, setReferenceValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceValue.trim() && method !== 'University API' && method !== 'Webhook') {
      toast.error('A submission reference is required for manual methods.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit
      await submitToUniversity({
        admissionId: submission.admissionId,
        universityId: submission.universityId,
        courseId: submission.courseId || undefined,
        method,
        notes: notes.trim() || undefined
      });

      // 2. Record reference if provided
      if (referenceValue.trim()) {
        await recordReference(submission.id, referenceType, referenceValue.trim(), method);
      }

      toast.success('Application submitted successfully!');
      onComplete();
    } catch (err: any) {
      console.error('[SubmissionWorkflow]', err);
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-primary/5 border-b border-border p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Submit Application</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {submission.studentName} • {submission.universityName}
          </p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Send className="w-6 h-6" />
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Submission Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUBMISSION_METHODS.map((m) => {
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-start p-3 border rounded-lg text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/50 bg-background"
                    )}
                  >
                    <m.icon className={cn("w-5 h-5 mt-0.5 mr-3 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <div className={cn("font-medium text-sm", isSelected ? "text-primary" : "text-foreground")}>
                        {m.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Idempotency Warning */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-lg flex gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <strong className="block mb-1">Idempotency Protection Active</strong>
              The system will generate a unique signature for this submission based on the student, university, and program. Duplicate submissions will be automatically blocked.
            </div>
          </div>

          {/* Reference Capture */}
          {method !== 'University API' && method !== 'Webhook' && (
            <div className="bg-muted/30 p-5 rounded-lg border border-border space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileKey className="w-4 h-4 text-muted-foreground" />
                Capture Submission Reference
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reference Type *</label>
                  <select
                    value={referenceType}
                    onChange={(e) => setReferenceType(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                    required
                  >
                    <option value="Application Number">App Number</option>
                    <option value="Portal Reference">Portal Ref</option>
                    <option value="Email ID">Email ID</option>
                    <option value="Ticket Number">Ticket Number</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reference Value *</label>
                  <input
                    type="text"
                    value={referenceValue}
                    onChange={(e) => setReferenceValue(e.target.value)}
                    placeholder={`e.g. ${referenceType === 'Application Number' ? 'APP-12345' : 'REF-9988'}`}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Internal Submission Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details about the submission process..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-foreground bg-background border border-input hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Finalize Submission
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
