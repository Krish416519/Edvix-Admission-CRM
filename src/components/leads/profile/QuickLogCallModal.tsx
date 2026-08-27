import { useState, useRef, useEffect } from 'react';
import { Phone, X, Clock, ChevronDown, Calendar, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from "../../../contexts/AuthContext";

const CONTACT_RESULTS = ['Connected', 'Not Answered', 'Busy', 'Switched Off', 'Invalid Number', 'Call Back Requested', 'WhatsApp Only'];
const COUNSELING_RESULTS = ['Interested', 'Highly Interested', 'Comparing Universities', 'Needs More Information', 'Parent Discussion Required', 'Follow-up Required', 'Application Ready', 'Not Interested'];
const OBJECTIONS = ['None', 'Fee', 'EMI', 'University Brand', 'Recognition', 'Placement', 'Course', 'Eligibility', 'Timing', 'Parent Approval', 'Competitor', 'Online Education Concern', 'Other'];
const FOLLOW_UP_TYPES = ['Call', 'WhatsApp', 'Email', 'Document Follow-up', 'Payment Follow-up', 'Parent Follow-up'];

interface QuickLogCallModalProps {
  leadId: string;
  leadName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function QuickLogCallModal({ leadId, leadName, onClose, onSaved }: QuickLogCallModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'log' | 'followup'>('log');
  const [isSaving, setIsSaving] = useState(false);

  const [callData, setCallData] = useState({
    duration: '',
    contactResult: '',
    counselingResult: '',
    objection: 'None',
    notes: '',
    lostReason: '',
  });
  const [followup, setFollowup] = useState({
    enabled: false,
    date: '',
    time: '',
    type: 'Call',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!callData.contactResult) {
      toast.error('Please select a contact result');
      return;
    }
    if (callData.counselingResult === 'Not Interested' && !callData.lostReason) {
      toast.error('Please provide a Lost Reason');
      return;
    }
    setIsSaving(true);
    try {
      // 1. Insert activity record
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'Call',
        outcome: callData.contactResult,
        notes: [
          callData.counselingResult && `Result: ${callData.counselingResult}`,
          callData.objection !== 'None' && `Objection: ${callData.objection}`,
          callData.counselingResult === 'Not Interested' && `Lost Reason: ${callData.lostReason}`,
          callData.duration && `Duration: ${callData.duration} min`,
          callData.notes,
        ].filter(Boolean).join('\n'),
        created_by: user?.id,
      });

      // 2. Update lead's last contacted at and potentially status
      const leadUpdates: any = { last_contacted_at: new Date().toISOString() };
      
      if (callData.counselingResult === 'Not Interested') {
        leadUpdates.lead_status = 'Lost';
        leadUpdates.lost_reason = callData.lostReason;
      }
      
      await supabase.from('leads').update(leadUpdates).eq('id', leadId);

      // 3. Create follow-up task if requested
      if (followup.enabled && followup.date) {
        const dueDateStr = followup.date;
        const dueTimeStr = followup.time || '09:00';
        const dueDate = new Date(`${dueDateStr}T${dueTimeStr}`);
        
        await supabase.from('tasks').insert({
          lead_id: leadId,
          title: `${followup.type} follow-up with ${leadName}`,
          task_type: followup.type,
          due_date: dueDateStr,
          due_time: dueTimeStr,
          priority: 'High',
          status: 'Pending',
          assigned_user: user?.id,
        });

        await supabase.from('leads').update({
          next_action_date: dueDate.toISOString(),
        }).eq('id', leadId);
      }

      toast.success('Call logged successfully');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log call');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Log Call</h3>
              <p className="text-xs text-muted-foreground">{leadName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Duration */}
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="number"
              placeholder="Duration (minutes) — optional"
              value={callData.duration}
              onChange={e => setCallData(p => ({ ...p, duration: e.target.value }))}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Contact Result */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Contact Result *</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CONTACT_RESULTS.map(r => (
                <button
                  key={r}
                  onClick={() => setCallData(p => ({ ...p, contactResult: r }))}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center',
                    callData.contactResult === r
                      ? 'bg-primary text-white border-primary'
                      : 'bg-muted/30 border-border hover:border-primary/40 text-foreground'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Counseling Result — only show if connected */}
          {(callData.contactResult === 'Connected' || callData.contactResult === 'Call Back Requested') && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Counseling Result</label>
              <div className="grid grid-cols-2 gap-2">
                {COUNSELING_RESULTS.map(r => (
                  <button
                    key={r}
                    onClick={() => setCallData(p => ({ ...p, counselingResult: r }))}
                    className={cn(
                      'px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left',
                      callData.counselingResult === r
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40'
                        : 'bg-muted/30 border-border hover:border-primary/40 text-foreground'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {callData.counselingResult === 'Not Interested' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 block">Lost Reason *</label>
              <select
                value={callData.lostReason}
                onChange={e => setCallData(p => ({ ...p, lostReason: e.target.value }))}
                className="w-full px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-destructive appearance-none text-foreground"
              >
                <option value="">Select Reason</option>
                <option value="Budget Issue">Budget Issue</option>
                <option value="Eligibility Issue">Eligibility Issue</option>
                <option value="Chose Offline Program">Chose Offline Program</option>
                <option value="Competitor Selected">Competitor Selected</option>
                <option value="Duplicate Lead">Duplicate Lead</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}

          {/* Objection */}
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="relative flex-1">
              <select
                value={callData.objection}
                onChange={e => setCallData(p => ({ ...p, objection: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                {OBJECTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Notes */}
          <textarea
            placeholder="Quick notes about the call..."
            value={callData.notes}
            onChange={e => setCallData(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />

          {/* Follow-up */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setFollowup(p => ({ ...p, enabled: !p.enabled }))}
              className={cn('w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors text-left',
                followup.enabled ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground hover:bg-muted/50')}
            >
              <Calendar className="w-4 h-4" />
              {followup.enabled ? 'Follow-up scheduled' : '+ Schedule follow-up'}
            </button>
            {followup.enabled && (
              <div className="p-4 space-y-3 border-t border-border bg-card">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                    <input type="date" value={followup.date} onChange={e => setFollowup(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                    <input type="time" value={followup.time} onChange={e => setFollowup(p => ({ ...p, time: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {FOLLOW_UP_TYPES.map(t => (
                    <button key={t}
                      onClick={() => setFollowup(p => ({ ...p, type: t }))}
                      className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all',
                        followup.type === t ? 'bg-primary text-white border-primary' : 'border-border text-foreground hover:border-primary/40')}
                    >{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-muted rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !callData.contactResult}
            className="flex-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Call Log'}
          </button>
        </div>
      </div>
    </div>
  );
}
