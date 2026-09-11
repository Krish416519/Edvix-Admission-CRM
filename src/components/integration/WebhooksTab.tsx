import { useState } from 'react';
import {
  Webhook,
  Plus,
  Settings2,
  Activity,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  AlertTriangle,
  Globe,
  Radio,
  X,
  Sparkles,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { WebhookConfig } from '../../types/integration';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const AVAILABLE_EVENTS = [
  { id: 'lead.created', label: 'Lead Created', desc: 'Triggered when a new prospective student inquiry arrives' },
  { id: 'lead.updated', label: 'Lead Updated', desc: 'Triggered when stage, priority, or score changes' },
  { id: 'lead.converted', label: 'Lead Converted', desc: 'Triggered when student accepts offer' },
  { id: 'admission.confirmed', label: 'Admission Confirmed', desc: 'Triggered when enrollment fee is verified' },
  { id: 'document.uploaded', label: 'Document Uploaded', desc: 'Triggered on candidate document verification' },
  { id: 'payment.received', label: 'Payment Received', desc: 'Triggered on tuition/token fee transaction' }
];

export function WebhooksTab() {
  const {
    webhooks,
    createWebhook,
    deleteWebhook,
    toggleWebhookStatus,
    rotateWebhookSecret,
    testWebhook
  } = useIntegration();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null);
  const [webhookToRotate, setWebhookToRotate] = useState<WebhookConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['lead.created', 'admission.confirmed']);
  const [secret, setSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const inboundUrl = 'https://crm.edvix.in/api/v1/webhooks/inbound/admissions';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error('Please provide a webhook name and endpoint URL');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must begin with https:// or http://');
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error('Please select at least one event trigger');
      return;
    }

    try {
      setIsSubmitting(true);
      await createWebhook({
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
        secret: secret.trim() || undefined
      });
      setIsAddModalOpen(false);
      setName('');
      setUrl('');
      setSecret('');
      setSelectedEvents(['lead.created', 'admission.confirmed']);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleTest = async (webhook: WebhookConfig) => {
    try {
      setTestingId(webhook.id);
      await testWebhook(webhook);
    } catch (e: any) {
      toast.error(`Ping delivery failed: ${e.message}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-blue-500/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Webhook className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Webhooks Engine</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Real-Time Push
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Configure live event endpoints to dispatch student admissions, status changes, and lead assignments to external ERPs, Zapier, or WhatsApp bots.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Webhook Endpoint
        </button>
      </div>

      {/* Inbound Global Webhook Box */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Your CRM Universal Inbound Endpoint</h3>
              <p className="text-xs text-muted-foreground">Receive leads from any external form, Facebook, or portal</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            POST JSON Ready
          </span>
        </div>

        <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl p-2">
          <code className="flex-1 font-mono text-xs px-2 text-foreground overflow-x-auto select-all">
            {inboundUrl}
          </code>
          <button
            onClick={() => handleCopy(inboundUrl, 'inbound')}
            className="bg-card hover:bg-muted text-foreground p-2 rounded-lg border border-border text-xs flex items-center gap-1.5 transition-colors font-medium shrink-0"
          >
            {copiedItemId === 'inbound' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configured Endpoints Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>Configured Endpoints</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {webhooks.length}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.map(webhook => {
            const isSecretVisible = visibleSecrets[webhook.id];
            const isTesting = testingId === webhook.id;
            const isCopied = copiedItemId === webhook.id;

            return (
              <div
                key={webhook.id}
                className={cn(
                  'bg-card border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:border-primary/40',
                  webhook.status === 'Active' ? 'border-border' : 'border-border/60 opacity-75'
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                          webhook.status === 'Active'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        <Webhook className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{webhook.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{webhook.events.length} subscribed events</span>
                          <span>•</span>
                          <span>Retries: {webhook.retryCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleWebhookStatus(webhook.id, webhook.status)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer',
                        webhook.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          webhook.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                        )}
                      />
                      {webhook.status}
                    </button>
                  </div>

                  {/* Destination URL */}
                  <div className="bg-muted/40 border border-border rounded-xl p-2.5 mb-3 flex items-center justify-between gap-2">
                    <code className="font-mono text-xs text-foreground truncate flex-1 select-all">
                      {webhook.url}
                    </code>
                    <button
                      onClick={() => handleCopy(webhook.url, webhook.id)}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Copy URL"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Events chips */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {webhook.events.map((evt, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>

                  {/* Signing Secret Box */}
                  <div className="bg-muted/20 border border-border rounded-xl p-2.5 mb-4 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="font-semibold text-[11px]">HMAC Signing Secret</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleSecrets(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))
                          }
                          className="hover:text-foreground flex items-center gap-1 text-[11px]"
                        >
                          {isSecretVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                          {isSecretVisible ? 'Hide' : 'Reveal'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setWebhookToRotate(webhook)}
                          className="hover:text-primary flex items-center gap-1 text-[11px]"
                          title="Rotate Secret"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Rotate
                        </button>
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-foreground select-all">
                      {isSecretVisible ? webhook.secret : 'whsec_••••••••••••••••••••••••'}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Activity className="w-3.5 h-3.5" />
                    <span>
                      {webhook.lastTriggeredAt
                        ? `Last ping: ${new Date(webhook.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Never dispatched'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTest(webhook)}
                      className="bg-primary/10 hover:bg-primary/20 text-primary font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pinging...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Test Ping</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWebhookToDelete(webhook)}
                      className="text-muted-foreground hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete Webhook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {webhooks.length === 0 && (
            <div className="col-span-full bg-card border border-dashed border-border rounded-2xl p-12 text-center">
              <Webhook className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="font-bold text-base text-foreground">No Webhook Endpoints Configured</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                Set up webhook URLs to push instant real-time student applications to your partner institutions, Zapier, or marketing automation platforms.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-xs"
              >
                Add Your First Webhook
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD WEBHOOK                                      */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Add Outbound Webhook</h3>
                  <p className="text-xs text-muted-foreground">Deliver real-time JSON payloads to your destination.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Webhook Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zapier Admission Slack Bot, ERP Campus Sync"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Destination URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono text-xs text-foreground"
                />
              </div>

              {/* Event Triggers */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Subscribe to Events *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_EVENTS.map(evt => {
                    const isChecked = selectedEvents.includes(evt.id);
                    return (
                      <div
                        key={evt.id}
                        onClick={() => toggleEvent(evt.id)}
                        className={cn(
                          'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs',
                          isChecked
                            ? 'bg-blue-500/5 border-blue-500/30 text-foreground'
                            : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{evt.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">({evt.id})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{evt.desc}</div>
                        </div>
                        <div
                          className={cn(
                            'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2',
                            isChecked ? 'bg-primary border-primary text-white' : 'border-muted-foreground'
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  HMAC Secret (Optional - Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="whsec_..."
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono text-xs text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Configuring...' : 'Save Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DELETE CONFIRMATION                              */}
      {/* ========================================================= */}
      {webhookToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Delete Webhook Endpoint?</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">{webhookToDelete.name}</strong>? Edvix will immediately stop sending payload dispatches to this URL.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWebhookToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteWebhook(webhookToDelete.id);
                  setWebhookToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-colors"
              >
                Yes, Delete Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ROTATE SECRET CONFIRMATION                       */}
      {/* ========================================================= */}
      {webhookToRotate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Rotate Webhook Signing Secret?</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Rotating this secret will invalidate the previous key. You must update the receiver application immediately to continue verifying HMAC signatures.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWebhookToRotate(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await rotateWebhookSecret(webhookToRotate.id);
                  setWebhookToRotate(null);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-colors"
              >
                Rotate Secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
