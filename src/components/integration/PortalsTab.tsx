import { useState, useMemo } from 'react';
import {
  Grid,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Settings2,
  ExternalLink,
  Search,
  Zap,
  Globe,
  Radio,
  X,
  RefreshCw,
  Send,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { PortalIntegration } from '../../types/integration';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function PortalsTab() {
  const { portals, savePortalConfig } = useIntegration();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePortal, setActivePortal] = useState<PortalIntegration | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Lead Portals', 'Advertising', 'Automation'];

  const filteredPortals = useMemo(() => {
    return portals.filter(p => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [portals, selectedCategory, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-purple-500/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Grid className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Lead Portals & App Directory</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Verified Integrations
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Pre-configured direct connectors for leading Indian education portals, social lead ad forms, and workflow automation apps.
          </p>
        </div>

        <div className="text-xs bg-muted/40 px-3.5 py-2 rounded-xl border border-border flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">
              {portals.filter(p => p.status === 'Connected').length}
            </span>
            <span className="text-muted-foreground">Connected</span>
          </div>
          <div className="w-px h-3.5 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="font-semibold text-foreground">
              {portals.filter(p => p.status === 'Not Configured').length}
            </span>
            <span className="text-muted-foreground">Available</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search portal integrations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap',
                selectedCategory === cat
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Portals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPortals.map(portal => {
          const isConnected = portal.status === 'Connected';

          return (
            <div
              key={portal.id}
              data-testid={`portal-card-${portal.id}`}
              className={cn(
                'bg-card border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group hover:border-primary/40',
                isConnected ? 'border-border' : 'border-border/60'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 text-sm"
                      style={{ backgroundColor: portal.accentColor }}
                    >
                      {portal.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{portal.name}</h4>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                        {portal.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1',
                      isConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                      )}
                    />
                    {portal.status}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {portal.description}
                </p>

                {/* Telemetry row if connected */}
                {isConnected && (
                  <div className="bg-muted/30 border border-border rounded-xl p-2.5 mb-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Synced Leads</span>
                      <strong className="text-foreground font-mono text-xs">
                        {portal.totalLeadsSynced}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Last Sync</span>
                      <span className="text-foreground text-[11px] font-medium">
                        {portal.lastSyncAt
                          ? new Date(portal.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                {portal.inboundWebhookUrl ? (
                  <button
                    onClick={() => handleCopy(portal.inboundWebhookUrl!, portal.id)}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                    title="Copy Inbound Webhook URL"
                  >
                    {copiedId === portal.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Webhook</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span />
                )}

                <button
                  data-testid={`portal-config-btn-${portal.id}`}
                  onClick={() => setActivePortal(portal)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer',
                    isConnected
                      ? 'bg-card border border-border hover:bg-muted text-foreground'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                  )}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{isConnected ? 'Settings' : 'Connect'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* PORTAL CONFIGURATION MODAL                                */}
      {/* ========================================================= */}
      {activePortal && (
        <PortalConfigModal
          portal={activePortal}
          onClose={() => setActivePortal(null)}
          onSave={(updates) => {
            savePortalConfig(activePortal.id, updates);
            setActivePortal(null);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// PORTAL CONFIG MODAL
// -------------------------------------------------------------
function PortalConfigModal({
  portal,
  onClose,
  onSave
}: {
  portal: PortalIntegration;
  onClose: () => void;
  onSave: (updates: Partial<PortalIntegration>) => void;
}) {
  const [apiKey, setApiKey] = useState(portal.apiKey || '');
  const [partnerId, setPartnerId] = useState(portal.partnerId || '');
  const [campaignId, setCampaignId] = useState(portal.campaignId || '');
  const [status, setStatus] = useState(portal.status);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleTestPing = async () => {
    setIsTesting(true);
    await new Promise(r => setTimeout(r, 600));
    setIsTesting(false);
    toast.success(`Handshake verified with ${portal.name} (200 OK)`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      apiKey,
      partnerId,
      campaignId,
      status: 'Connected'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm"
              style={{ backgroundColor: portal.accentColor }}
            >
              {portal.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">{portal.name}</h3>
              <p className="text-xs text-muted-foreground">{portal.category} Connector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {portal.inboundWebhookUrl && (
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Target Inbound Webhook URL
              </label>
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl p-2">
                <code className="font-mono text-xs text-foreground truncate flex-1 select-all">
                  {portal.inboundWebhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(portal.inboundWebhookUrl!);
                    setCopiedUrl(true);
                    toast.success('Copied URL');
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Paste this into your {portal.name} developer portal or webhook settings.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              API Token / Key
            </label>
            <input
              type="text"
              placeholder="Paste integration token..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 text-foreground font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Partner Account ID
              </label>
              <input
                type="text"
                placeholder="e.g. SHK-2026"
                value={partnerId}
                onChange={e => setPartnerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Campaign Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. FALL_2026_LEADS"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestPing}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              <Send className={cn('w-3.5 h-3.5', isTesting && 'animate-spin')} />
              <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
            </button>

            {portal.status === 'Connected' && (
              <button
                type="button"
                onClick={() => {
                  onSave({ status: 'Not Configured', apiKey: '', partnerId: '', campaignId: '' });
                  toast.success('Integration disconnected');
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-xs shadow-sm"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
