import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useUniversityOpsActions, UniversitySubmission } from '../../hooks/useUniversityOps';
import { AlertCircle, FilePlus, Calendar, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface AdditionalInfoRequestProps {
  submission: UniversitySubmission;
  onComplete: () => void;
  onCancel: () => void;
}

const REQUEST_TYPES = [
  'Additional Documents',
  'Clarification',
  'Re-submission',
  'Eligibility Proof',
  'Other'
];

export function AdditionalInfoRequest({ submission, onComplete, onCancel }: AdditionalInfoRequestProps) {
  const { user } = useAuth();
  const { updateSubmissionStatus } = useUniversityOpsActions();
  const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the AIR record
      const { data: air, error: airError } = await supabase
        .from('university_info_requests')
        .insert({
          submission_id: submission.id,
          university_id: submission.universityId,
          request_type: requestType,
          description: description.trim(),
          deadline: deadline || null,
          created_by: user?.id,
          owner_id: submission.counselorId // Assign to the counselor
        })
        .select()
        .single();

      if (airError) throw airError;

      // 2. Automatically create a CRM task for the counselor
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: `URGENT: University Request for ${submission.studentName}`,
          description: `The university has requested additional information:\n\nType: ${requestType}\nDetails: ${description.trim()}\n\nPlease coordinate with the student and fulfill this request.`,
          task_type: 'Follow-up',
          priority: 'High',
          status: 'Pending',
          due_date: deadline || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // default 48h
          assigned_to: submission.counselorId || user?.id,
          lead_id: null,
          admission_id: submission.admissionId,
          created_by: user?.id
        });

      if (taskError) {
        console.error('Failed to create task, but AIR was created', taskError);
      }

      // 3. Update submission status
      await updateSubmissionStatus(submission.id, 'Additional Information Required', `AIR created: ${requestType}`);

      toast.success('Additional Information Request logged and assigned');
      onComplete();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to log request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg max-w-2xl mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-orange-50 dark:bg-orange-500/10 border-b border-orange-100 dark:border-orange-500/20 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-orange-900 dark:text-orange-100">Log University Request (AIR)</h2>
          <p className="text-sm text-orange-700/80 dark:text-orange-200/80 mt-1">
            {submission.studentName} • {submission.universityName}
          </p>
        </div>
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
          <AlertCircle className="w-6 h-6" />
        </div>
      </div>

      <div className="p-6 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Logging this request will automatically change the application status and create an urgent CRM task for the assigned counselor ({submission.counselorName || 'Unassigned'}).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Request Type <span className="text-red-500">*</span>
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              required
            >
              {REQUEST_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Deadline <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Exactly what information or documents did the university ask for?"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground min-h-[120px] resize-y"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> Log Request & Assign Task
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
