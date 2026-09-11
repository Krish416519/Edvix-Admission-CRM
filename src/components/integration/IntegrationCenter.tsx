import { useState } from 'react';
import {
  Network,
  Key,
  Webhook,
  FileSpreadsheet,
  Activity,
  Zap,
  Grid,
  ShieldCheck,
  RefreshCw,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiKeysTab } from './ApiKeysTab';
import { WebhooksTab } from './WebhooksTab';
import { ImportTab } from './ImportTab';
import { LogsTab } from './LogsTab';
import { PortalsTab } from './PortalsTab';
import { PipelineTesterTab } from './PipelineTesterTab';
import { useIntegration } from '../../lib/integrationService';

type Tab = 'Portals & Apps' | 'API Keys' | 'Webhooks' | 'Import' | 'Logs' | 'Pipeline Simulator';

export function IntegrationCenter() {
  const { apiKeys, webhooks, logs, importJobs, portals, refreshAll } = useIntegration();
  const [activeTab, setActiveTab] = useState<Tab>('Portals & Apps');

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
  }[] = [
    {
      id: 'Portals & Apps',
      label: 'Lead Portals & Apps',
      icon: Grid,
      badge: portals.filter(p => p.status === 'Connected').length
    },
    {
      id: 'API Keys',
      label: 'API Keys',
      icon: Key,
      badge: apiKeys.filter(k => k.status === 'Active').length
    },
    {
      id: 'Webhooks',
      label: 'Inbound & Outbound Webhooks',
      icon: Webhook,
      badge: webhooks.length
    },
    {
      id: 'Import',
      label: 'CSV / Excel Import',
      icon: FileSpreadsheet,
      badge: importJobs.length
    },
    {
      id: 'Logs',
      label: 'API Traffic Logs',
      icon: Activity,
      badge: logs.length
    },
    {
      id: 'Pipeline Simulator',
      label: 'Pipeline Simulator',
      icon: Zap,
      badge: 'Live'
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full pb-12">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                Omnichannel Lead Capture & Integrations
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect verified education portals, configure REST API keys, orchestrate webhooks, and import student datasets.
              </p>
            </div>
          </div>
        </div>

        {/* Global Telemetry Pills */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-foreground">Inbound Gateway: Online</span>
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh integration data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Glassmorphic Container */}
      <div className="flex-1 bg-card/60 backdrop-blur-md border border-border rounded-3xl shadow-sm flex flex-col overflow-hidden">
        {/* Modern Tab Bar */}
        <div className="flex items-center overflow-x-auto border-b border-border/80 bg-muted/20 px-3 pt-2 shrink-0 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max pb-2">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative',
                    isActive
                      ? 'bg-card text-foreground shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 p-6 md:p-8 bg-background/50">
          {activeTab === 'Portals & Apps' && <PortalsTab />}
          {activeTab === 'API Keys' && <ApiKeysTab />}
          {activeTab === 'Webhooks' && <WebhooksTab />}
          {activeTab === 'Import' && <ImportTab />}
          {activeTab === 'Logs' && <LogsTab />}
          {activeTab === 'Pipeline Simulator' && (
            <PipelineTesterTab onSwitchToLogs={() => setActiveTab('Logs')} />
          )}
        </div>
      </div>
    </div>
  );
}
