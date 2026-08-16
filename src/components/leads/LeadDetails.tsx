import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { mockActivities } from '../../data/mockActivities';
import { Lead, LeadStatus, LeadActivity } from '../../types/schema';
import { toast } from 'sonner';
import { LeadProfileSidebar } from './profile/LeadProfileSidebar';
import { addAuditLog } from '../../data/mockAuditLogs';
import { LeadProfileTabs } from './profile/LeadProfileTabs';
import { LeadAI_Sidebar } from './profile/LeadAI_Sidebar';
import { MobileActionBar } from './mobile/MobileActionBar';
import { automationService } from '../../lib/automationService';

import { useLead } from '../../hooks/useLead';
import { Skeleton } from '../ui/Skeleton';

export function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { lead, isLoading, updateLead } = useLead(id);
  
  // Activities state (temporarily keeping mock activities until migrated)
  const initialActivities = mockActivities.filter(a => a.leadId === id) || [];
  const [activities, setActivities] = useState<LeadActivity[]>(
    initialActivities.length > 0 ? initialActivities : mockActivities
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-4rem)] pt-2 pb-6 px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex flex-col xl:flex-row gap-6 items-stretch flex-1 min-h-0">
          <Skeleton className="w-full xl:w-80 h-full rounded-2xl" />
          <Skeleton className="flex-1 h-full rounded-2xl" />
          <Skeleton className="w-full xl:w-80 h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <h2 className="text-2xl font-bold mb-4">Lead Not Found</h2>
        <button 
          onClick={() => navigate('/leads')}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  const handleUpdateLead = async (data: Partial<Lead>) => {
    await updateLead(data);
    
    // Only log if not just a status change, to avoid duplicate logging
    if (Object.keys(data).length > 0 && !data.status) {
      addAuditLog({
        action: 'Updated',
        entityType: 'Lead',
        entityId: lead.id,
        title: 'Lead Updated',
        description: `Lead information was updated.`,
        userName: 'Current User',
        leadId: lead.id
      });
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (newStatus === lead.status) return;
    
    await updateLead({ status: newStatus });
    
    addAuditLog({
      action: 'Status Changed',
      entityType: 'Lead',
      entityId: lead.id,
      title: 'Lead Status Changed',
      description: `Status changed from ${lead.status} to ${newStatus}.`,
      previousValue: lead.status,
      newValue: newStatus,
      userName: 'Current User',
      leadId: lead.id
    });
    
    // Fire Automation Engine Event
    automationService.triggerEvent('Lead Status Changed', { 
      lead: { ...lead, status: newStatus },
      oldStatus: lead.status,
      newStatus
    });
    
    toast.success(`Status updated to ${newStatus}`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-4rem)] pt-2 pb-6 px-4 sm:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/leads')}
            className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{lead.name}'s Profile</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="New">New</option>
            <option value="Attempted">Attempted</option>
            <option value="Connected">Connected</option>
            <option value="Interested">Interested</option>
            <option value="Qualified">Qualified</option>
            <option value="Application Started">Application Started</option>
            <option value="Documents Pending">Documents Pending</option>
            <option value="Admission Done">Admission Done</option>
            <option value="Lost">Lost</option>
          </select>
          <button className="p-2 bg-card border border-border rounded-lg text-foreground hover:bg-muted transition-colors shadow-sm">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch flex-1 min-h-0 xl:overflow-hidden overflow-y-auto pb-20 xl:pb-0">
        <LeadProfileSidebar lead={lead} />
        <LeadProfileTabs lead={lead} onUpdateLead={handleUpdateLead} activities={activities} setActivities={setActivities} />
        <LeadAI_Sidebar lead={lead} />
      </div>

      <MobileActionBar phone={lead.phone} />
    </div>
  );
}
