
import { Lead, LeadStatus } from '../../../types/schema';
import { Phone, MessageCircle, GraduationCap, Building2, ChevronRight, Clock, Flame, Wind, Thermometer } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';

interface MobileLeadCardProps {
  lead: Lead;
  statusColors: Record<LeadStatus, string>;
  onClick?: () => void;
  key?: React.Key;
}

function getTemperature(score: number) {
  if (score >= 81) return { label: '🔥 Hot', emoji: '🔥', color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-500/20' };
  if (score >= 61) return { label: '🟠 Warm', emoji: '🟠', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-500/20' };
  if (score >= 31) return { label: '🔵 Cool', emoji: '🔵', color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400', ring: 'ring-sky-200 dark:ring-sky-500/20' };
  return { label: '❄️ Cold', emoji: '❄️', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-500/20' };
}

export function MobileLeadCard({ lead, statusColors, onClick }: MobileLeadCardProps) {
  const navigate = useNavigate();
  const { makeCall } = useTelephony();
  const { user } = useAuth();
  const score = lead.leadScore ?? lead.score ?? 0;
  const temp = getTemperature(score);

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

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      className={cn(
        'bg-card border border-border rounded-2xl shadow-sm',
        'active:scale-[0.985] active:shadow-none transition-all duration-150 cursor-pointer',
        'select-none relative overflow-hidden touch-manipulation',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      {/* Status accent line */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', statusColors[displayStatus]?.split(' ')[0]?.replace('bg-', 'bg-'))} />

      <div className="px-4 pt-3.5 pb-3 ml-1">
        {/* Top row: Name + status badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {/* Avatar initial */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-2',
                temp.color, temp.ring
              )}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[15px] text-foreground leading-tight truncate">{displayName}</h3>
                <p className="text-[11px] text-muted-foreground font-medium">{lead.leadNumber || lead.id?.slice(0, 8)}</p>
              </div>
            </div>
          </div>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 mt-1',
            statusColors[displayStatus] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {displayStatus}
          </span>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 mb-3">
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-foreground">{lead.phone}</span>
            </div>
          )}
          {(typeof lead.course === 'object' ? lead.course?.name : lead.course) && (
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{typeof lead.course === 'object' ? lead.course?.name : lead.course}</span>
            </div>
          )}
          {(typeof lead.university === 'object' ? lead.university?.name : lead.university) && (
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{typeof lead.university === 'object' ? lead.university?.name : lead.university}</span>
            </div>
          )}
          {lead.nextActionDate && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Follow-up: {new Date(lead.nextActionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* Bottom row: Score + actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-lg text-[11px] font-bold', temp.color)}>
              {temp.emoji} {score}
            </span>
            {lead.createdAt && (
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              aria-label={`WhatsApp ${displayName}`}
              className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors active:scale-90 touch-manipulation"
            >
              <MessageCircle className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleCall}
              aria-label={`Call ${displayName}`}
              className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors active:scale-90 touch-manipulation"
            >
              <Phone className="w-4 h-4 fill-current" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
