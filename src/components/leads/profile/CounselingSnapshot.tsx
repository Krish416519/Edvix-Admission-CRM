import React, { useMemo, useState } from 'react';
import { Lead } from '../../../types/schema';
import { 
  Zap, Flame, Thermometer, Snowflake, 
  AlertCircle, CheckCircle, HelpCircle, Clock, 
  ArrowRight, User, GraduationCap, Briefcase, DollarSign, Building,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface CounselingSnapshotProps {
  lead: Lead;
}

const INTENT_CONFIG = {
  HOT: { icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-300/40' },
  WARM: { icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-300/40' },
  COLD: { icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-300/40' },
} as const;

const ELIGIBILITY_CONFIG = {
  VERIFIED: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Eligible' },
  POSSIBLE: { icon: HelpCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Possible' },
  'NOT ELIGIBLE': { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Not Eligible' },
  'MANUAL REVIEW': { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Review' },
} as const;

function computeIntent(lead: Lead): 'HOT' | 'WARM' | 'COLD' {
  const urgency = lead.urgency?.toLowerCase();
  const status = (lead.leadStatus || lead.status || '').toLowerCase();
  if (urgency === 'immediate' || status.includes('application') || status === 'qualified') return 'HOT';
  if (urgency === 'high' || status === 'interested' || status === 'connected') return 'WARM';
  return 'COLD';
}

function computeEligibility(lead: Lead): 'VERIFIED' | 'POSSIBLE' | 'NOT ELIGIBLE' | 'MANUAL REVIEW' {
  const gradPct = lead.graduationPercentage;
  const backlogs = lead.graduationBacklogs || 0;
  if (!gradPct) return 'MANUAL REVIEW';
  if (gradPct >= 50 && backlogs === 0) return 'VERIFIED';
  if (gradPct >= 45) return 'POSSIBLE';
  return 'NOT ELIGIBLE';
}

function computeNextAction(lead: Lead): string {
  const status = (lead.leadStatus || lead.status || 'New');
  if (status === 'New') return 'Call student — first contact';
  if (status === 'Attempted') return 'Retry call / send WhatsApp';
  if (status === 'Connected' || status === 'Interested') {
    if (!lead.graduationPercentage) return 'Capture academic details';
    if (!lead.course) return 'Recommend programs';
    return 'Schedule follow-up call';
  }
  if (status === 'Qualified') return 'Send university comparison';
  if (status === 'Application Started') return 'Check pending documents';
  if (status === 'Documents Pending') return 'Follow up on missing documents';
  if (status === 'Admission Done') return 'Confirm payment receipt';
  if (status === 'Lost') return 'Schedule re-engagement after 30 days';
  return 'Review and update profile';
}

interface SnipProps { label: string; value: string; icon?: React.ElementType; dimmed?: boolean; }

function Snip({ label, value, icon: Icon, dimmed }: SnipProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={cn("flex items-center gap-1.5 text-sm font-semibold truncate", dimmed ? 'text-muted-foreground italic font-normal' : 'text-foreground')}>
        {Icon && <Icon className="w-3.5 h-3.5 text-primary shrink-0" />}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

export function CounselingSnapshot({ lead }: CounselingSnapshotProps) {
  const intent = useMemo(() => computeIntent(lead), [lead]);
  const eligibility = useMemo(() => computeEligibility(lead), [lead]);
  const nextAction = useMemo(() => computeNextAction(lead), [lead]);
  const [isMinimized, setIsMinimized] = useState(true);

  const IntentIcon = INTENT_CONFIG[intent].icon;
  const EligIcon = ELIGIBILITY_CONFIG[eligibility].icon;

  const educationSummary = lead.graduationDegree && lead.graduationPercentage
    ? `${lead.graduationDegree} — ${lead.graduationPercentage}%`
    : lead.education || '—';

  const expSummary = lead.yearsOfExperience ? `${lead.yearsOfExperience} yrs` : (lead.employmentStatus || 'Fresher');

  const courseName = typeof lead.course === 'object' ? lead.course?.name : lead.course;
  const universityName = typeof lead.university === 'object' ? lead.university?.name : lead.university;

  return (
    <div className="shrink-0 bg-card border border-border rounded-lg sm:rounded-xl shadow-sm overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">Counseling Snapshot</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Intent Badge */}
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
            INTENT_CONFIG[intent].bg, INTENT_CONFIG[intent].border, INTENT_CONFIG[intent].color)}>
            <IntentIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{intent}</span>
          </div>
          {/* Eligibility Badge */}
          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
            ELIGIBILITY_CONFIG[eligibility].bg, ELIGIBILITY_CONFIG[eligibility].color)}>
            <EligIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{ELIGIBILITY_CONFIG[eligibility].label}</span>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand Snapshot" : "Minimize Snapshot"}
            className="ml-0.5 sm:ml-1 p-1 sm:p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors shrink-0 active:scale-95 touch-manipulation"
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Snapshot Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-3 sm:gap-x-4 gap-y-3 sm:gap-y-4 px-3 sm:px-4 py-3 sm:py-4 border-t border-border bg-card">
            <Snip label="Goal" value={lead.careerGoal || '—'} icon={User} dimmed={!lead.careerGoal} />
            <Snip label="Education" value={educationSummary} icon={GraduationCap} dimmed={!lead.graduationDegree} />
            <Snip label="Experience" value={expSummary} icon={Briefcase} />
            <Snip label="Budget" value={lead.budget || '—'} icon={DollarSign} dimmed={!lead.budget} />
            <Snip label="Program" value={courseName || '—'} icon={GraduationCap} dimmed={!courseName} />
            <Snip label="Preferred Univs" value={universityName || '—'} icon={Building} dimmed={!universityName} />
            <Snip label="Main Objection" value={lead.aiObjectionDetected || 'None'} icon={AlertCircle} dimmed={!lead.aiObjectionDetected} />
            <Snip label="Urgency" value={lead.urgency || 'Unknown'} dimmed={!lead.urgency} />
          </div>

          {/* Next Action Bar */}
          <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/5 border-t border-border">
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Next:</span>
            <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">{nextAction}</span>
          </div>
        </>
      )}
    </div>
  );
}
