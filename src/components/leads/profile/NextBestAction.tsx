import React from 'react';
import { Lead } from '../../../types/schema';
import { ArrowRight, Phone, Calendar, GraduationCap, BookOpen, FileText, CreditCard, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface NextBestActionProps {
  lead: Lead;
  onQuickCall?: () => void;
  onDisposition?: () => void;
}

interface Action {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  priority: 'critical' | 'high' | 'medium';
  actionType: 'call' | 'disposition' | 'info' | null;
}

function getNextAction(lead: Lead): Action {
  const status = (lead.leadStatus || lead.status || 'New');
  const hasAcademic = !!(lead.graduationDegree || lead.graduationPercentage);
  const hasCourse = !!lead.course;
  
  const lastContactDate = lead.lastContactedAt ? new Date(lead.lastContactedAt) : null;
  const daysSinceContact = lastContactDate ? Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (status === 'New') {
    return { label: 'Call Student Now', description: 'First contact — no call recorded yet.', icon: Phone, color: 'text-red-500 bg-red-500/10 border-red-300/40', priority: 'critical', actionType: 'call' };
  }
  if (status === 'Attempted') {
    return { label: 'Retry Call / WhatsApp', description: 'Student not connected yet. Try again or send a WhatsApp.', icon: Phone, color: 'text-amber-500 bg-amber-500/10 border-amber-300/40', priority: 'high', actionType: 'call' };
  }
  if ((status === 'Connected' || status === 'Interested') && !hasAcademic) {
    return { label: 'Verify Eligibility', description: "Connected but academic history isn't captured. Fill the 360° profile.", icon: GraduationCap, color: 'text-purple-500 bg-purple-500/10 border-purple-300/40', priority: 'high', actionType: 'info' };
  }
  if ((status === 'Connected' || status === 'Interested') && !hasCourse) {
    return { label: 'Recommend Programs', description: 'Student eligible but no program shortlisted. Recommend courses.', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10 border-blue-300/40', priority: 'high', actionType: 'disposition' };
  }
  if (daysSinceContact > 14 && status !== 'Lost' && status !== 'Admission Done' && status !== 'Closed') {
    return { label: 'Start Re-engagement', description: 'No response for over 14 days. Reach out again.', icon: RefreshCw, color: 'text-orange-500 bg-orange-500/10 border-orange-300/40', priority: 'high', actionType: 'call' };
  }
  if (status === 'Interested' || status === 'Qualified') {
    return { label: 'Schedule Follow-up', description: 'Student is interested. Lock in a follow-up time now.', icon: Calendar, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-300/40', priority: 'high', actionType: 'disposition' };
  }
  if (status === 'Application Started' || status === 'Documents Pending') {
    return { label: 'Request Missing Documents', description: 'Application in progress. Chase pending documents.', icon: FileText, color: 'text-orange-500 bg-orange-500/10 border-orange-300/40', priority: 'high', actionType: 'call' };
  }
  if (status === 'Admission Done') {
    return { label: 'Confirm Payment Received', description: 'Admission confirmed. Verify payment and update records.', icon: CreditCard, color: 'text-emerald-600 bg-emerald-600/10 border-emerald-400/40', priority: 'medium', actionType: null };
  }
  if (status === 'Lost') {
    return { label: 'Schedule Re-engagement', description: 'Lost lead. Re-engage after 30 days with updated offers.', icon: RefreshCw, color: 'text-muted-foreground bg-muted border-border', priority: 'medium', actionType: null };
  }
  return { label: 'Review Lead Profile', description: 'Review and update the student profile to proceed.', icon: CheckCircle, color: 'text-primary bg-primary/10 border-primary/30', priority: 'medium', actionType: null };
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-amber-500 text-white',
  medium: 'bg-muted text-muted-foreground',
};

export function NextBestAction({ lead, onQuickCall, onDisposition }: NextBestActionProps) {
  const action = getNextAction(lead);
  const Icon = action.icon;

  const handleAction = () => {
    if (action.actionType === 'call') onQuickCall?.();
    else if (action.actionType === 'disposition') onDisposition?.();
  };

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-3 bg-card', action.color.split(' ').filter(c => c.startsWith('border')).join(' '))}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', action.color.split(' ').filter(c => !c.startsWith('text') && !c.startsWith('border')).join(' '))}>
            <Icon className={cn('w-4 h-4', action.color.split(' ').find(c => c.startsWith('text')))} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next Best Action</p>
            <h4 className="font-bold text-foreground text-sm">{action.label}</h4>
          </div>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0', PRIORITY_BADGE[action.priority])}>
          {action.priority}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">{action.description}</p>

      {action.actionType && (
        <button
          onClick={handleAction}
          className={cn(
            'flex items-center gap-2 justify-center w-full py-2 rounded-lg text-sm font-semibold transition-colors',
            action.actionType === 'call' ? 'bg-primary text-white hover:bg-primary/90' : 'bg-muted hover:bg-muted/80 text-foreground'
          )}
        >
          <Icon className="w-4 h-4" />
          {action.label}
          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
        </button>
      )}
    </div>
  );
}
