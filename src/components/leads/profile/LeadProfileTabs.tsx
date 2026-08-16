import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Lead } from '../../../types/schema';
import { OverviewTab } from './tabs/OverviewTab';
import { TimelineTab } from './tabs/TimelineTab';
import { NotesTab } from './tabs/NotesTab';
import { TasksTab } from './tabs/TasksTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { AdmissionTab } from './tabs/AdmissionTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { CommunicationTab } from './tabs/CommunicationTab';
import { LeadWhatsAppChat } from '../../whatsapp/LeadWhatsAppChat';
import { LeadEmailTab } from '../../email/LeadEmailTab';
import { CallHistoryTab } from './tabs/CallHistoryTab';
import { AIRecommendationTab } from './tabs/AIRecommendationTab';
import { DispositionHistory } from './DispositionHistory';

type Tab = 'Overview' | 'Timeline' | 'AI Engine' | 'Notes' | 'Tasks' | 'Calls' | 'Dispositions' | 'Documents' | 'Admission' | 'Payments' | 'WhatsApp' | 'Email' | 'Communication';

const tabs: Tab[] = [
  'Overview',
  'Timeline',
  'AI Engine',
  'Notes',
  'Tasks',
  'Calls',
  'Dispositions',
  'Documents',
  'Admission',
  'Payments',
  'WhatsApp',
  'Email',
  'Communication'
];

interface LeadProfileTabsProps {
  lead: Lead;
  onUpdateLead: (data: Partial<Lead>) => void;
  activities: any[];
  setActivities: any;
}

export function LeadProfileTabs({ lead, onUpdateLead, activities, setActivities }: LeadProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-xl shadow-sm xl:h-full xl:max-h-[85vh] xl:overflow-hidden min-h-[500px]">
      {/* Tab Navigation */}
      <div className="flex items-center overflow-x-auto border-b border-border hide-scrollbar shrink-0 bg-muted/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all outline-none",
              activeTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-card relative">
        {activeTab === 'Overview' && <OverviewTab lead={lead} onUpdateLead={onUpdateLead} />}
        {activeTab === 'Timeline' && <TimelineTab lead={lead} />}
        {activeTab === 'AI Engine' && <div className="p-4 h-full"><AIRecommendationTab lead={lead} /></div>}
        {activeTab === 'Notes' && <NotesTab lead={lead} />}
        {activeTab === 'Tasks' && <TasksTab lead={lead} />}
        {activeTab === 'Calls' && <CallHistoryTab lead={lead} />}
        {activeTab === 'Dispositions' && <div className="p-4 h-full"><DispositionHistory leadId={lead.id} /></div>}
        {activeTab === 'Documents' && <DocumentsTab lead={lead} />}
        {activeTab === 'Admission' && <AdmissionTab lead={lead} />}
        {activeTab === 'Payments' && <PaymentsTab lead={lead} />}
        {activeTab === 'WhatsApp' && <div className="p-4 h-full"><LeadWhatsAppChat lead={lead} /></div>}
        {activeTab === 'Email' && <div className="p-4 h-full"><LeadEmailTab lead={lead} /></div>}
        {activeTab === 'Communication' && <CommunicationTab lead={lead} />}
      </div>
    </div>
  );
}
