import React from 'react';
import { Lead, LeadStatus } from '../../../types/schema';
import { Phone, MessageCircle, GraduationCap, Building2, Flame } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';

interface MobileLeadCardProps {
  key?: React.Key;
  lead: Lead;
  onClick?: () => void;
  statusColors: Record<LeadStatus, string>;
}

export function MobileLeadCard({ lead, onClick, statusColors }: MobileLeadCardProps) {
  const navigate = useNavigate();
  const { makeCall } = useTelephony();
  const { user } = useAuth();

  const getTemperature = (score: number) => {
    if (score >= 91) return { label: 'Ready', color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' };
    if (score >= 61) return { label: 'Hot', color: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400' };
    if (score >= 31) return { label: 'Warm', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' };
    return { label: 'Cold', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' };
  };

  const temp = getTemperature(lead.score || 0);

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user && lead.phone) {
      makeCall({
        to: lead.phone,
        leadId: lead.id,
        counselorId: user.id
      });
    } else if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  return (
    <div 
      onClick={() => {
        if (onClick) onClick();
        else navigate(`/leads/${lead.id}`);
      }}
      className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer mb-3 select-none relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-[16px] text-foreground leading-tight mb-1">{lead.name}</h3>
          <p className="text-xs text-muted-foreground font-medium">{lead.leadNumber}</p>
        </div>
        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap", statusColors[lead.status])}>
          {lead.status}
        </span>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-foreground font-medium">
            <Phone className="w-4 h-4 text-muted-foreground" />
            {lead.phone}
          </div>
        )}
        {lead.course && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span className="truncate">{lead.course}</span>
          </div>
        )}
        {lead.university && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{lead.university}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold", temp.color)}>
            <Flame className="w-3.5 h-3.5" />
            <span>{lead.score || 0}</span>
          </div>
          {lead.createdAt && (
            <span className="text-[11px] text-muted-foreground font-medium">
              {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleWhatsApp}
            className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-500 hover:bg-green-100 transition-colors active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={handleCall}
            className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 hover:bg-blue-100 transition-colors active:scale-95"
          >
            <Phone className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
