
import { Webhook, Plus, Settings2, Activity, Loader2 } from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function WebhooksTab() {
  const { webhooks } = useIntegration();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-500" />
            Inbound Webhooks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure endpoints to receive real-time lead data from Zapier, Make, or custom sources.</p>
        </div>
        <button 
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
          onClick={() => toast.success('Webhook creation mocked')}
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webhooks.map(webhook => (
          <div key={webhook.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{webhook.name}</h3>
                  <p className="text-xs text-muted-foreground">{webhook.events.join(', ')}</p>
                </div>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                webhook.status === 'Active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {webhook.status}
              </span>
            </div>
            
            <div className="bg-muted rounded-lg p-3 mb-4 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
              {webhook.url}
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Activity className="w-3.5 h-3.5" />
                Last triggered: {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleString() : 'Never'}
              </div>
              <button className="text-primary font-medium flex items-center gap-1 hover:underline">
                <Settings2 className="w-4 h-4" />
                Configure Mapping
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
