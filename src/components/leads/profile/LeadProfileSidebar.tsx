import React from 'react';
import { Lead } from '../../../types/schema';
import { Mail, MapPin, Phone, Building, GraduationCap, User, Target, Hash, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LeadAssignmentPanel } from './LeadAssignmentPanel';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

export function LeadProfileSidebar({ lead }: { lead: Lead }) {
  const { makeCall } = useTelephony();
  const { user } = useAuth();
  
  const handleCall = () => {
    if (!user) return;
    makeCall({
      to: lead.phone,
      leadId: lead.id,
      counselorId: user.id
    });
  };

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
      case 'High': return 'text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-500';
      case 'Medium': return 'text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-500';
      case 'Low': return 'text-green-600 bg-green-100 dark:bg-green-500/10 dark:text-green-500';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="w-full xl:w-72 shrink-0 flex flex-col gap-4 xl:overflow-y-auto xl:pb-6">
      {/* Profile Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-4xl border-2 border-primary/20 shadow-sm mb-4">
            {lead.name.charAt(0)}
          </div>
          <h2 className="text-xl font-bold text-foreground">{lead.name}</h2>
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold mt-2", getStatusColor(lead.status))}>
            {lead.status}
          </span>
        </div>

        <div className="mt-6 pt-5 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>Lead ID</span>
            </div>
            <span className="font-semibold text-sm">{lead.id}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Lead Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-bold text-foreground">{lead.score}/100</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Priority</span>
            </div>
            <span className={cn("px-2 py-0.5 rounded text-xs font-bold", getPriorityColor(lead.priority))}>
              {lead.priority}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Counselor</span>
            </div>
            <span className="font-medium text-sm text-foreground">
              {typeof lead.counselor === 'string' ? lead.counselor : lead.counselor?.name || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span>Source</span>
            </div>
            <span className="font-medium text-sm text-foreground">{lead.source}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Captured On</span>
            </div>
            <span className="font-medium text-sm text-foreground">
              {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Target Details</h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Course</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{lead.course || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">University</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{lead.university || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="h-px bg-border my-2" />
          
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Phone</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-semibold text-foreground">{lead.phone}</p>
                <button 
                  onClick={handleCall}
                  className="bg-primary/10 hover:bg-primary/20 text-primary p-1 rounded-full transition-colors ml-auto"
                  title="Click to Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Email</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 break-all">{lead.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Location</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{lead.city}, {lead.state}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Assignment Panel */}
      <LeadAssignmentPanel lead={lead} />
    </div>
  );
}
