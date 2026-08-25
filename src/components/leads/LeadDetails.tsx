import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, CheckCircle2 } from 'lucide-react';
import { mockActivities } from '../../data/mockActivities';
import { Lead, LeadStatus, LeadActivity } from '../../types/schema';
import { toast } from 'sonner';
import { LeadProfileSidebar } from './profile/LeadProfileSidebar';
import { addAuditLog } from '../../data/mockAuditLogs';
import { LeadProfileTabs } from './profile/LeadProfileTabs';
import { LeadAI_Sidebar } from './profile/LeadAI_Sidebar';
import { MobileActionBar } from './mobile/MobileActionBar';
import { automationService } from '../../lib/automationService';
import { DispositionWidget } from './profile/DispositionWidget';
import { CounselingSnapshot } from './profile/CounselingSnapshot';
import { QuickLogCallModal } from './profile/QuickLogCallModal';

import { useLead } from '../../hooks/useLead';
import { Skeleton } from '../ui/Skeleton';

export function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [showDisposition, setShowDisposition] = useState(false);
  const [showQuickCall, setShowQuickCall] = useState(false);
  const { lead, isLoading, updateLead } = useLead(id);
  
  // Activities state (temporarily keeping mock activities until migrated)
  const initialActivities = mockActivities.filter(a => a.leadId === id) || [];
  const [activities, setActivities] = useState<LeadActivity[]>(
    initialActivities.length > 0 ? initialActivities : mockActivities
  );

  useEffect(() => {
    const handleOpenDisposition = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.leadId === lead?.id) {
        setShowDisposition(true);
      }
    };
    window.addEventListener('open-disposition', handleOpenDisposition);
    return () => window.removeEventListener('open-disposition', handleOpenDisposition);
  }, [lead?.id]);

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
    const currentStatus = lead.leadStatus || lead.status;
    if (newStatus === currentStatus) return;
    
    await updateLead({ leadStatus: newStatus, status: newStatus });
    
    addAuditLog({
      action: 'Status Changed',
      entityType: 'Lead',
      entityId: lead.id,
      title: 'Lead Status Changed',
      description: `Status changed from ${currentStatus} to ${newStatus}.`,
      previousValue: currentStatus,
      newValue: newStatus,
      userName: 'Current User',
      leadId: lead.id
    });
    
    automationService.triggerEvent('Lead Status Changed', { 
      lead: { ...lead, leadStatus: newStatus, status: newStatus },
      oldStatus: currentStatus,
      newStatus
    });
    
    toast.success(`Status updated to ${newStatus}`);
  };

  const displayName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown';
  const displayStatus = (lead.leadStatus || lead.status || 'New') as LeadStatus;

  const handleCall = () => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (lead.phone) {
      let clean = lead.phone.replace(/[^0-9]/g, '');
      if (clean.length === 10) clean = '91' + clean;
      window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500 h-[calc(100vh-4rem)] pt-2 pb-6 px-4 sm:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{displayName}'s Profile</h1>
            <p className="text-xs text-muted-foreground">{lead.leadNumber || lead.id?.slice(0,8)}</p>
          </div>
        </div>

        {/* Desktop Action Bar — all actions visible on desktop, hidden on mobile (mobile uses bottom bar) */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {/* WhatsApp */}
          {lead.phone && (
            <button
              onClick={handleWhatsApp}
              title="Send WhatsApp"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 font-semibold text-sm hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          )}

          {/* Call */}
          {lead.phone && (
            <button
              onClick={handleCall}
              title={`Call ${lead.phone}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              <Phone className="w-4 h-4 fill-current" />
              Call
            </button>
          )}

          {/* Status quick-change */}
          <select
            value={displayStatus}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
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

          {/* Update Disposition */}
          <button
            onClick={() => setShowDisposition(!showDisposition)}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {showDisposition ? 'Close' : 'Disposition'}
          </button>
          {/* Quick Log Call */}
          {lead.phone && (
            <button
              onClick={() => setShowQuickCall(true)}
              title="Quick Log Call"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" />
              Log Call
            </button>
          )}
        </div>

        {/* Mobile: just the status selector + disposition toggle (mobile bar handles call/whatsapp) */}
        <div className="sm:hidden flex items-center gap-2">
          <select
            value={displayStatus}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
        </div>
      </div>

      {showDisposition && (
        <div className="mb-2 shrink-0 animate-in fade-in slide-in-from-top-2">
          <DispositionWidget 
            leadId={lead.id} 
            currentStatus={lead.status} 
            onSaved={() => {
              setShowDisposition(false);
              // Trigger reload of lead to show new status
              updateLead({ id: lead.id });
            }}
            onCancel={() => setShowDisposition(false)}
          />
        </div>
      )}

      {/* Counseling Snapshot */}
      <CounselingSnapshot lead={lead} />

      {/* Main 3-Column Layout — pb-28 on mobile to clear the action bar */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch flex-1 min-h-0 xl:overflow-hidden overflow-y-auto pb-28 xl:pb-0">
        <LeadProfileSidebar lead={lead} />
        <LeadProfileTabs lead={lead} onUpdateLead={handleUpdateLead} activities={activities} setActivities={setActivities} />
        <LeadAI_Sidebar lead={lead} />
      </div>

      {showQuickCall && (
        <QuickLogCallModal
          leadId={lead.id}
          leadName={displayName}
          onClose={() => setShowQuickCall(false)}
          onSaved={() => updateLead({ id: lead.id } as any)}
        />
      )}

      <MobileActionBar
        leadId={lead.id}
        phone={lead.phone}
        leadStatus={lead.leadStatus || lead.status || 'New'}
        onDispositionSaved={() => {
          // Refresh lead data after disposition is saved from mobile bar
          updateLead({ id: lead.id } as any);
        }}
      />
    </div>
  );
}
