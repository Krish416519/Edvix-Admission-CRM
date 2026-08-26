import React from 'react';
import { Lead } from '../../../types/schema';
import { Sun, Sparkles, ArrowLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { format } from 'date-fns';

export function LeadProfileHeader({ lead, actionButtons, onBack }: { lead: Lead, actionButtons?: React.ReactNode, onBack?: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-500';
      case 'Contacted': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500';
      case 'Interested': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-500';
      case 'Qualified': return 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-500';
      case 'Application Started': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-500';
      case 'Documents Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500';
      case 'Admission Done': return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500';
      case 'Lost': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-500 border-red-500/20';
      case 'Medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-500/10 dark:text-orange-500 border-orange-500/20';
      case 'Low': return 'text-green-600 bg-green-100 dark:bg-green-500/10 dark:text-green-500 border-green-500/20';
      default: return 'text-muted-foreground bg-muted border-transparent';
    }
  };

  const priorityLabel = lead.priority?.toUpperCase() || 'NORMAL';
  const statusLabel = lead.status || lead.leadStatus || 'New';
  const dateStr = lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A';

  return (
    <div className="w-full flex flex-col gap-2 md:gap-3 pt-2 pb-3 md:pb-4 px-1 md:px-2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between w-full gap-3 md:gap-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 md:p-2 -ml-1 md:-ml-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Name */}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            {lead.name}
          </h2>

          {/* Priority Badge */}
          {lead.priority && (
            <div className={cn("px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] lg:text-xs font-bold uppercase tracking-wider flex items-center gap-1 md:gap-1.5 border", getPriorityColor(lead.priority))}>
              {lead.priority === 'High' ? <Sparkles className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" /> : <Sun className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />}
              <span className="hidden sm:inline">{priorityLabel}</span>
              <span className="sm:hidden">{lead.priority}</span>
            </div>
          )}

          {/* Status Badge */}
          <div className={cn("px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] lg:text-xs font-semibold border border-transparent shadow-sm", getStatusColor(statusLabel))}>
            {statusLabel}
          </div>

          {/* Date Captured Badge - Hidden on small mobile */}
          <div className="hidden sm:flex px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] lg:text-xs font-medium bg-muted/30 border border-border text-muted-foreground shadow-sm">
            {dateStr}
          </div>

          {/* Source Badge - Hidden on small mobile */}
          {lead.source && (
            <div className="hidden sm:flex px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] lg:text-xs font-medium bg-muted/30 border border-border text-muted-foreground shadow-sm">
              {lead.source}
            </div>
          )}
        </div>

        {/* Action Buttons - Hidden on mobile, shown in MobileActionBar instead */}
        {actionButtons && (
          <div className="hidden md:flex items-center gap-2 shrink-0 flex-wrap">
            {actionButtons}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 sm:gap-3 sm:mt-1">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm font-medium text-muted-foreground/80">
          <span className="text-foreground/90 truncate max-w-[150px] md:max-w-none">{lead.course || 'Not Selected'}</span>
          <span className="text-border hidden sm:inline">|</span>
          <span className="text-foreground/90 truncate max-w-[150px] md:max-w-none">{lead.university || 'Not Selected'}</span>
          <span className="text-border hidden sm:inline">|</span>
          <span className="text-foreground/90 tracking-wide">{lead.phone}</span>
          <span className="text-border hidden lg:inline">|</span>
          <span className="text-foreground/90 truncate max-w-[180px] md:max-w-none hidden lg:inline">{lead.email}</span>
        </div>
        
        {/* Counselor Badge */}
        <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] lg:text-xs font-medium bg-primary/5 border border-primary/10 text-primary shadow-sm shrink-0 w-fit">
          <span className="hidden sm:inline">Counselor: </span>{typeof lead.counselor === 'string' ? lead.counselor : lead.counselor?.name || 'Unassigned'}
        </div>
      </div>
    </div>
  );
}
