import React, { useState } from 'react';
import { Lead, LeadStatus, LeadPriority } from '../../../types/schema';
import { 
  Phone, MessageCircle, GraduationCap, Building2, ChevronRight, 
  Clock, User, Check, ChevronDown, Sparkles, Layers, PhoneCall, Calendar
} from 'lucide-react';
import { cn, formatDate } from '../../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { computeIntent } from '../../../lib/leadIntent';

interface MobileLeadCardProps {
  lead: Lead;
  statusColors: Record<LeadStatus, string>;
  onClick?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  showCheckbox?: boolean;
}

export function MobileLeadCard({ 
  lead, 
  statusColors, 
  onClick,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false
}: MobileLeadCardProps) {
  const navigate = useNavigate();
  const { makeCall } = useTelephony();
  const { user } = useAuth();
  const [showDetails, setShowDetails] = useState(false);

  const score = lead.leadScore ?? lead.score ?? 0;
  const intent = computeIntent(lead);
  const intentConfig = {
    HOT: { emoji: '🔥', color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-500/20' },
    WARM: { emoji: '🟠', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-500/20' },
    COLD: { emoji: '❄️', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-500/20' },
  }[intent];

  const priorityColors: Record<string, string> = {
    High: 'text-red-700 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    Medium: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    Low: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  const handleCardClick = () => {
    if (onClick) onClick();
    else navigate(`/all-leads/${lead.id}`);
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) return;
    if (user && lead.id) {
      makeCall({ to: lead.phone, leadId: lead.id, counselorId: user.id });
    } else {
      window.location.href = `tel:${lead.phone}`;
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) return;
    let clean = lead.phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer');
  };

  const displayName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown';
  const displayStatus = (lead.leadStatus || lead.status || 'New') as LeadStatus;
  const counselorName = typeof lead.counselor === 'object' ? (lead.counselor as any)?.name : (lead as any).counselorName || (lead as any).counselor || 'Unassigned';
  const courseName = typeof lead.course === 'object' ? lead.course?.name : lead.course;
  const universityName = typeof lead.university === 'object' ? lead.university?.name : lead.university;

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={cn(
        'bg-card border rounded-2xl shadow-sm transition-all duration-200 cursor-pointer',
        'select-none relative overflow-hidden touch-manipulation',
        isSelected 
          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]' 
          : 'border-border hover:border-border-hover active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      {/* Status accent border bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl', statusColors[displayStatus]?.split(' ')[0] || 'bg-primary')} />

      <div className="p-4 pl-4.5">
        {/* Top row: Checkbox + Name + Status + Priority */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Selection Checkbox (always accessible for touch) */}
            {(showCheckbox || onToggleSelect) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect?.(lead.id, e);
                }}
                className={cn(
                  'w-6 h-6 mt-0.5 rounded-lg border flex items-center justify-center transition-all shrink-0 touch-manipulation',
                  isSelected 
                    ? 'bg-primary border-primary text-white shadow-sm' 
                    : 'border-border bg-background hover:border-primary/50'
                )}
                aria-label={isSelected ? `Deselect ${displayName}` : `Select ${displayName}`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            {/* Avatar initial */}
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ring-1 shadow-sm',
              intentConfig.color, intentConfig.ring
            )}>
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[15px] text-foreground leading-tight truncate">{displayName}</h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-medium">
                <span>{lead.leadNumber || lead.id?.slice(0, 8)}</span>
                {lead.priority && (
                  <span className={cn('px-1.5 py-0.2 rounded border text-[10px] font-semibold', priorityColors[lead.priority] || priorityColors.Low)}>
                    {lead.priority}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 shadow-xs border',
            statusColors[displayStatus] || 'bg-muted text-muted-foreground border-border'
          )}>
            {displayStatus}
          </span>
        </div>

        {/* Primary Lead Details */}
        <div className="space-y-1.5 my-3 text-xs">
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground tracking-wide">{lead.phone}</span>
            </div>
          )}
          {courseName && (
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{courseName}</span>
            </div>
          )}
          {universityName && (
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{universityName}</span>
            </div>
          )}
          {counselorName && counselorName !== 'Unassigned' && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">Counselor: <strong className="text-foreground">{counselorName}</strong></span>
            </div>
          )}
          {lead.nextActionDate && (
            <div className="flex items-center gap-2 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Follow-up: {new Date(lead.nextActionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Expandable Secondary Details Section */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-2 bg-muted/20 -mx-4 px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block">Lead Source:</span>
                <span className="font-semibold text-foreground">{lead.source || lead.leadSource || 'Direct'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Budget:</span>
                <span className="font-semibold text-foreground">{lead.budget ? `₹${lead.budget}` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Call Attempts:</span>
                <span className="font-semibold text-foreground">{lead.callAttempts ?? 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Interactions:</span>
                <span className="font-semibold text-foreground">{lead.interactionsCount ?? 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Created:</span>
                <span className="font-semibold text-foreground">{lead.createdAt ? formatDate(lead.createdAt) : 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Last Modified:</span>
                <span className="font-semibold text-foreground">{(lead.updatedAt || (lead as any).modifiedAt) ? formatDate(lead.updatedAt || (lead as any).modifiedAt) : 'N/A'}</span>
              </div>
            </div>
            {lead.notes && (
              <div className="pt-1 border-t border-border/40 text-[11px]">
                <span className="text-muted-foreground block font-medium">Latest Note:</span>
                <p className="text-foreground italic line-clamp-2 mt-0.5">{lead.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Secondary Details Toggle Button */}
        <div className="pt-1 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-primary/5 transition-colors touch-manipulation"
          >
            {showDetails ? 'Hide Details' : 'View All 29 Column Info'}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showDetails && "rotate-180")} />
          </button>
        </div>

        {/* Bottom row: Score & Quick touch actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2">
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs', intentConfig.color)}>
              {intentConfig.emoji} {score}
            </span>
            {lead.createdAt && (
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lead.phone && (
              <>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  aria-label={`WhatsApp ${displayName}`}
                  className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors active:scale-90 touch-manipulation shadow-xs"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleCall}
                  aria-label={`Call ${displayName}`}
                  className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors active:scale-90 touch-manipulation shadow-xs"
                >
                  <Phone className="w-4.5 h-4.5 fill-current" />
                </button>
              </>
            )}
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <ChevronRight className="w-4.5 h-4.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
