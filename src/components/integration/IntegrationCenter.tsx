import { useState } from 'react';
import { Network, Key, Webhook, FileSpreadsheet, Activity, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiKeysTab } from './ApiKeysTab';
import { WebhooksTab } from './WebhooksTab';
import { ImportTab } from './ImportTab';
import { LogsTab } from './LogsTab';
import { toast } from 'sonner';
import { useIntegration } from '../../lib/integrationService';

type Tab = 'API Keys' | 'Webhooks' | 'Import' | 'Logs' | 'Pipeline Tester';

export function IntegrationCenter() {
  const { simulateInboundLead } = useIntegration();
  const [activeTab, setActiveTab] = useState<Tab>('API Keys');
  const [testPayload, setTestPayload] = useState('{\n  "name": "Test Student",\n  "email": "test@example.com",\n  "phone": "9876543210",\n  "course": "B.Tech"\n}');

  const tabs: { id: Tab; icon: React.ElementType }[] = [
    { id: 'API Keys', icon: Key },
    { id: 'Webhooks', icon: Webhook },
    { id: 'Import', icon: FileSpreadsheet },
    { id: 'Logs', icon: Activity },
    { id: 'Pipeline Tester', icon: Zap },
  ];

  const handleSimulateWebhook = async () => {
    try {
      const parsed = JSON.parse(testPayload);
      const result = await simulateInboundLead(parsed, 'Webhook Tester');
      toast.success(`Lead ${result.status} successfully`);
      setActiveTab('Logs'); // Switch to logs to see it
    } catch (e: any) {
      toast.error('Failed to parse JSON payload or validation failed');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Network className="w-6 h-6 text-indigo-500" />
          Omnichannel Lead Capture
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage API keys, inbound webhooks, CSV imports, and routing rules.</p>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex items-center overflow-x-auto border-b border-border bg-muted/10 px-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.id}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar">
          {activeTab === 'API Keys' && <ApiKeysTab />}
          {activeTab === 'Webhooks' && <WebhooksTab />}
          {activeTab === 'Import' && <ImportTab />}
          {activeTab === 'Logs' && <LogsTab />}
          
          {activeTab === 'Pipeline Tester' && (
            <div className="max-w-2xl mx-auto space-y-4 pt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Simulate Inbound Lead</h2>
                  <p className="text-sm text-muted-foreground">Test validation, deduplication, and auto-assignment locally.</p>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-4">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">JSON Payload</label>
                <textarea 
                  className="w-full h-48 bg-muted/50 border border-border rounded-lg p-3 font-mono text-sm outline-none focus:border-primary resize-none"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleSimulateWebhook}
                  className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm"
                >
                  Fire Webhook
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg text-sm mt-4">
                <strong>How it works:</strong> The simulated engine will extract the payload, check for duplicate emails/phones against existing leads, and either Merge or Create a new lead. Check the <strong>Logs</strong> tab after firing to see the result.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
