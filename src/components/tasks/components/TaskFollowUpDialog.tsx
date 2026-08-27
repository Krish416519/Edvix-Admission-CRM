import { useState } from 'react';
import { Task } from '../../../types/task';
import { LeadStatus } from '../../../types/schema';
import { X, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TaskFollowUpDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { 
    notes: string; 
    newLeadStatus?: LeadStatus; 
    scheduleNext: boolean; 
    nextTaskDate?: string; 
    nextTaskTime?: string 
  }) => void;
}

export function TaskFollowUpDialog({ task, isOpen, onClose, onComplete }: TaskFollowUpDialogProps) {
  const [notes, setNotes] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<LeadStatus | ''>('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      notes,
      newLeadStatus: newLeadStatus as LeadStatus || undefined,
      scheduleNext,
      nextTaskDate: scheduleNext ? nextDate : undefined,
      nextTaskTime: scheduleNext ? nextTime : undefined
    });
  };

  const statuses: LeadStatus[] = ['New', 'Attempted', 'Connected', 'Interested', 'Qualified', 'Application Started', 'Documents Pending', 'Admission Done', 'Lost'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-end md:justify-center p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-card md:border md:border-border shadow-2xl md:rounded-xl rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 ease-out">
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Complete Task</h2>
              <p className="text-xs text-muted-foreground">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
          <form id="followup-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Call/Meeting Notes *</label>
              <textarea 
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Summarize the outcome of this task..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {task.leadName && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Update Lead Status (Optional)</label>
                <select 
                  value={newLeadStatus}
                  onChange={(e) => setNewLeadStatus(e.target.value as LeadStatus)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Don't change status --</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  checked={scheduleNext}
                  onChange={(e) => setScheduleNext(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">Schedule next follow-up task</span>
              </label>

              {scheduleNext && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block flex items-center gap-2"><Calendar className="w-4 h-4"/> Next Date *</label>
                    <input 
                      required={scheduleNext}
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block flex items-center gap-2"><Clock className="w-4 h-4"/> Next Time</label>
                    <input 
                      type="time"
                      value={nextTime}
                      onChange={(e) => setNextTime(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-3 bg-muted/20 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="followup-form"
            className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Mark as Completed
          </button>
        </div>
      </div>
    </div>
  );
}
