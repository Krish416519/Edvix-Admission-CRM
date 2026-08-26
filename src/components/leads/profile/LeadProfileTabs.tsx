import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { Lead } from '../../../types/schema';
import { OverviewTab } from './tabs/OverviewTab';
import { TimelineTab } from './tabs/TimelineTab';

import { TasksTab } from './tabs/TasksTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { AdmissionTab } from './tabs/AdmissionTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { CommunicationTab } from './tabs/CommunicationTab';
import { LeadWhatsAppChat } from '../../whatsapp/LeadWhatsAppChat';
import { LeadEmailTab } from '../../email/LeadEmailTab';
import { CallHistoryTab } from './tabs/CallHistoryTab';
import { MatchRecommendTab } from './tabs/MatchRecommendTab';
import { DispositionHistory } from './DispositionHistory';

type Tab = 'Overview' | 'Timeline' | 'Match & Recommend' | 'Tasks' | 'Calls' | 'Dispositions' | 'Documents' | 'Admission' | 'Payments' | 'WhatsApp' | 'Email' | 'Communication';

const tabs: Tab[] = [
  'Overview',
  'Timeline',
  'Match & Recommend',
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
  activityRefreshKey?: number;
}

export function LeadProfileTabs({ lead, onUpdateLead, activities, setActivities, activityRefreshKey = 0 }: LeadProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-card border border-border rounded-lg md:rounded-xl shadow-sm">
      {/* Tab Navigation */}
      <div className="flex items-center overflow-x-auto border-b border-border scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent shrink-0 bg-muted/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 md:px-5 py-2.5 md:py-3.5 text-xs md:text-sm font-semibold whitespace-nowrap border-b-2 transition-all outline-none flex-shrink-0",
              activeTab === tab 
                ? "border-primary text-primary bg-primary/5" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card relative overflow-auto">
        {activeTab === 'Overview' && <OverviewTab lead={lead} onUpdateLead={onUpdateLead} />}
        {activeTab === 'Timeline' && <TimelineTab lead={lead} refreshKey={activityRefreshKey} />}
        {activeTab === 'Match & Recommend' && <div className="p-3 md:p-4 h-full"><MatchRecommendTab lead={lead} /></div>}
        {activeTab === 'Tasks' && <TasksTab lead={lead} />}
        {activeTab === 'Calls' && <CallHistoryTab lead={lead} />}
        {activeTab === 'Dispositions' && <div className="p-3 md:p-4 h-full"><DispositionHistory leadId={lead.id} refreshKey={activityRefreshKey} /></div>}
        {activeTab === 'Documents' && <DocumentsTab lead={lead} />}
        {activeTab === 'Admission' && <AdmissionTab lead={lead} />}
        {activeTab === 'Payments' && <PaymentsTab lead={lead} />}
        {activeTab === 'WhatsApp' && <div className="p-3 md:p-4 h-full"><LeadWhatsAppChat lead={lead} /></div>}
        {activeTab === 'Email' && <div className="p-3 md:p-4 h-full"><LeadEmailTab lead={lead} /></div>}
        {activeTab === 'Communication' && <CommunicationTab lead={lead} />}
      </div>
    </div>
  );
}
