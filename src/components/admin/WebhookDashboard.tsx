import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, RefreshCw, X, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function WebhookDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (user?.activeOrganizationId) {
      loadDeliveries();
    }
  }, [user?.activeOrganizationId]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('organization_id', user!.activeOrganizationId!)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error loading webhook deliveries:', error);
      toast.error('Failed to load webhook logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (delivery: any) => {
    try {
      setIsRetrying(true);
      
      // We will create a new Pending delivery log as a retry, and ping the webhook-runner again.
      // But actually, we don't need a new row if we just update the existing one.
      // Wait, to do it from the client securely without bypassing security, we could just ping the webhook-runner directly?
      // Since it's admin only, let's just create a new delivery log and trigger it via supabase function invoke.
      
      // Let's get the webhook secret
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('secret')
        .eq('id', delivery.webhook_id)
        .single();
        
      if (!webhook) {
         toast.error("Original webhook not found or deleted");
         return;
      }
      
      const { data: newDelivery, error: insertError } = await supabase
        .from('webhook_deliveries')
        .insert({
           organization_id: delivery.organization_id,
           webhook_id: delivery.webhook_id,
           event: delivery.event,
           url: delivery.url,
           request_payload: delivery.request_payload,
           status: 'Pending',
           retry_count: (delivery.retry_count || 0) + 1
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      
      // Ping edge function directly (since it's a manual retry)
      const { error: invokeError } = await supabase.functions.invoke('webhook-runner', {
        body: {
          delivery_id: newDelivery.id,
          url: newDelivery.url,
          secret: webhook.secret,
          payload: newDelivery.request_payload
        }
      });
      
      if (invokeError) {
        console.error("Function error:", invokeError);
      }
      
      toast.success('Retry dispatched');
      setSelectedDelivery(null);
      loadDeliveries();
      
    } catch (error) {
       console.error('Error retrying:', error);
       toast.error('Failed to retry webhook');
    } finally {
       setIsRetrying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Success') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === 'Failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'Dead Letter') return <XCircle className="w-4 h-4 text-slate-500" />;
    if (status === 'Pending Retry') return <RefreshCw className="w-4 h-4 text-amber-500 animate-spin-slow" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhook Logs</h1>
          <p className="text-muted-foreground">Monitor and retry external partner API integrations.</p>
        </div>
        <button
          onClick={loadDeliveries}
          className="p-2 bg-background border border-border rounded-md hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex gap-6 relative">
        <div className={`flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${selectedDelivery ? 'lg:w-2/3 lg:flex-none' : 'w-full'}`}>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-8 h-8 animate-pulse mx-auto mb-4" />
              Loading deliveries...
            </div>
          ) : deliveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Destination</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Delivery</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveries.map((delivery) => (
                    <tr 
                      key={delivery.id} 
                      className={`cursor-pointer transition-colors ${selectedDelivery?.id === delivery.id ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-muted/30 border-l-2 border-transparent'}`}
                      onClick={() => setSelectedDelivery(delivery)}
                    >
                      <td className="px-6 py-4 font-medium font-mono text-xs">{delivery.event}</td>
                      <td className="px-6 py-4 truncate max-w-[200px]" title={delivery.url}>{delivery.url}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(delivery.status)}
                          <span className={
                            delivery.status === 'Failed' ? 'text-red-600 font-medium' : 
                            delivery.status === 'Dead Letter' ? 'text-slate-500 font-medium line-through' :
                            delivery.status === 'Pending Retry' ? 'text-amber-600 font-medium' : ''
                          }>
                            {delivery.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(delivery.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="p-12 text-center border-t border-border">
               <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
               <h3 className="text-lg font-medium mb-1">No Webhook Deliveries</h3>
               <p className="text-sm text-muted-foreground max-w-md mx-auto">
                 When a webhook triggers, its delivery attempt and response will appear here.
               </p>
             </div>
          )}
        </div>

        {/* Slide-over Detail Panel */}
        {selectedDelivery && (
          <div className="hidden lg:block w-1/3 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col absolute right-0 top-0 bottom-0 min-h-[600px] h-full">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-semibold truncate pr-4">Delivery Details</h3>
              <button 
                onClick={() => setSelectedDelivery(null)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedDelivery.status)}
                    <span className="font-semibold text-lg">{selectedDelivery.status}</span>
                  </div>
                  {selectedDelivery.status === 'Pending Retry' && selectedDelivery.next_retry_at && (
                    <div className="text-xs text-amber-600 mt-1 font-medium">
                      Next retry: {new Date(selectedDelivery.next_retry_at).toLocaleString()}
                    </div>
                  )}
                  {selectedDelivery.status === 'Dead Letter' && (
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                      Permanently failed after {selectedDelivery.retry_count} retries
                    </div>
                  )}
                </div>
                {(selectedDelivery.status === 'Failed' || selectedDelivery.status === 'Dead Letter' || selectedDelivery.status === 'Success') && (
                  <button
                    onClick={() => handleRetry(selectedDelivery)}
                    disabled={isRetrying}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium rounded-md transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    Retry Manually
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">HTTP Status</div>
                  <div className="font-mono text-sm">{selectedDelivery.status_code || '---'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Retry Count</div>
                  <div className="font-mono text-sm">{selectedDelivery.retry_count}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Request Payload</div>
                <div className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                  <pre className="text-xs font-mono">{JSON.stringify(selectedDelivery.request_payload, null, 2)}</pre>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Response Payload</div>
                {selectedDelivery.response_payload ? (
                  <div className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                    <pre className="text-xs font-mono">{JSON.stringify(selectedDelivery.response_payload, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No response payload recorded.</div>
                )}
              </div>
              
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Modal for details (simplified logic for brevity, ideally responsive full-screen on mobile) */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm ${selectedDelivery ? 'block' : 'hidden'}`}>
        <div className="fixed inset-x-4 inset-y-10 bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
             {/* Same content as sidebar, duplicated or refactored to a shared component in real app */}
             <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Delivery Details</h3>
              <button onClick={() => setSelectedDelivery(null)} className="p-2"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
               <div className="mb-4">
                  <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status Code</div>
                  <div className="font-mono text-sm">{selectedDelivery?.status_code || '---'}</div>
               </div>
               <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Response Payload</div>
               <pre className="text-xs font-mono bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto mt-2">
                 {JSON.stringify(selectedDelivery?.response_payload, null, 2)}
               </pre>
            </div>
        </div>
      </div>
      
    </div>
  );
}
