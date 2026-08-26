import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { mockActivities } from '../../data/mockActivities';
import { Lead, LeadStatus, LeadActivity } from '../../types/schema';
import { toast } from 'sonner';
import { LeadProfileHeader } from './profile/LeadProfileHeader';
import { addAuditLog } from '../../data/mockAuditLogs';
import { LeadProfileTabs } from './profile/LeadProfileTabs';
import { LeadQuickViewSidebar } from './profile/LeadQuickViewSidebar';
import { MobileActionBar } from './mobile/MobileActionBar';
import { automationService } from '../../lib/automationService';
import { DispositionWidget } from './profile/DispositionWidget';
import { CounselingSnapshot } from './profile/CounselingSnapshot';
import { QuickLogCallModal } from './profile/QuickLogCallModal';
import { LeadAssignmentPanel } from './profile/LeadAssignmentPanel';

import { useLead } from '../../hooks/useLead';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';

export function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [showDisposition, setShowDisposition] = useState(false);
  const [showQuickCall, setShowQuickCall] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const { lead, isLoading, updateLead, refreshLead } = useLead(id);
  const { hasPermission } = useAuth();
  
  // Checking 'Edit Leads' because there is no explicit 'Assign' permission in the DB
  const canAssign = hasPermission('Edit Leads', 'Lead Management');
  
  // Activities state with localStorage persistence
  const initialActivities = (() => {
    try {
      const stored = localStorage.getItem(`activities_${id}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored activities');
    }
    const mock = mockActivities.filter(a => a.leadId === id) || [];
    return mock.length > 0 ? mock : mockActivities;
  })();

  const [activities, setActivities] = useState<LeadActivity[]>(initialActivities);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`activities_${id}`, JSON.stringify(activities));
    }
  }, [activities, id]);

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
      <div className="flex flex-col gap-4 md:gap-6 animate-in fade-in duration-500 h-[calc(100vh-4rem)] pt-2 pb-6 px-2 sm:px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 shrink-0">
          <Skeleton className="h-8 md:h-10 w-48 md:w-64" />
          <Skeleton className="h-8 md:h-10 w-32 md:w-48" />
        </div>
        <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-stretch flex-1 min-h-0">
          <Skeleton className="w-full xl:w-80 h-64 xl:h-full rounded-xl md:rounded-2xl" />
          <Skeleton className="flex-1 h-96 xl:h-full rounded-xl md:rounded-2xl" />
          <Skeleton className="w-full xl:w-80 h-64 xl:h-full rounded-xl md:rounded-2xl hidden xl:block" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-center">Lead Not Found</h2>
        <button 
          onClick={() => navigate('/leads')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm md:text-base"
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

  const actionButtons = (
    <>
      {canAssign && (
        <button
          onClick={() => setShowAssignmentModal(true)}
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold text-xs md:text-sm hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden lg:inline">Assign</span>
        </button>
      )}
      {lead.phone && (
        <button
          onClick={handleWhatsApp}
          title="Send WhatsApp"
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 font-semibold text-xs md:text-sm hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden lg:inline">WhatsApp</span>
        </button>
      )}
      {lead.phone && (
        <button
          onClick={handleCall}
          title={`Call ${lead.phone}`}
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-semibold text-xs md:text-sm hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
        >
          <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
          <span className="hidden lg:inline">Call</span>
        </button>
      )}
      <button
        onClick={() => setShowDisposition(!showDisposition)}
        className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-colors text-xs md:text-sm"
      >
        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden lg:inline">{showDisposition ? 'Close' : 'Add Activity'}</span>
        <span className="lg:hidden">Activity</span>
      </button>
      {lead.phone && (
        <button
          onClick={() => setShowQuickCall(true)}
          title="Quick Log Call"
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-primary text-white font-semibold text-xs md:text-sm hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden lg:inline">Log Call</span>
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3 md:gap-4 animate-in fade-in duration-500 min-h-screen pt-2 pb-10 px-2 sm:px-4 md:px-8">
      {showDisposition && (
        <>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] md:w-full max-w-3xl z-50 animate-in zoom-in-95 duration-200">
            <DispositionWidget 
              leadId={lead.id} 
              currentStatus={lead.status} 
              onSaved={(newStatus) => {
                setShowDisposition(false);
                refreshLead();
                // Force timeline to re-fetch immediately regardless of lead state timing
                setActivityRefreshKey(k => k + 1);
              }}
              onCancel={() => setShowDisposition(false)}
            />
          </div>
        </>
      )}

      {showAssignmentModal && (
        <>
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
            onClick={() => setShowAssignmentModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-xl max-h-[90vh] overflow-y-auto bg-card rounded-xl border border-border shadow-2xl z-50 animate-in zoom-in-95 duration-200 p-4 sm:p-6">
            <LeadAssignmentPanel lead={lead} />
          </div>
        </>
      )}

      <LeadProfileHeader 
        lead={lead} 
        actionButtons={actionButtons} 
        onBack={() => navigate('/leads')}
      />

      {/* Main Content Area */}
      <div className="flex flex-col xl:flex-row gap-4 md:gap-6 items-start pb-28 xl:pb-0">
        <div className="xl:sticky xl:top-4 xl:w-80 shrink-0 w-full z-40">
          <LeadQuickViewSidebar
            lead={lead}
            activities={activities}
            setActivities={setActivities}
          />
        </div>
        <div className="flex flex-col gap-3 md:gap-4 flex-1 min-w-0">
          <CounselingSnapshot lead={lead} />
          <LeadProfileTabs lead={lead} onUpdateLead={handleUpdateLead} activities={activities} setActivities={setActivities} activityRefreshKey={activityRefreshKey} />
        </div>
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
          refreshLead();
          setActivityRefreshKey(k => k + 1);
        }}
      />
    </div>
  );
}
