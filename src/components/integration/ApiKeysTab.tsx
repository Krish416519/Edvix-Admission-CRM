import { useState, useMemo } from 'react';
import {
  Key,
  Copy,
  Plus,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  Search,
  Download,
  Terminal,
  Clock,
  Sparkles,
  X,
  Lock,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ApiKey } from '../../types/integration';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const AVAILABLE_SCOPES = [
  { id: '*', label: 'Full Access (Admin)', desc: 'Access all endpoints and resources' },
  { id: 'lead:create', label: 'Create Leads', desc: 'Allow inbound leads injection' },
  { id: 'lead:read', label: 'Read Leads', desc: 'Query and fetch lead profiles' },
  { id: 'lead:update', label: 'Update Leads', desc: 'Modify status, tags, and stages' },
  { id: 'admission:read', label: 'Read Admissions', desc: 'View applications and statuses' },
  { id: 'document:create', label: 'Upload Documents', desc: 'Push applicant certificates' },
  { id: 'payment:read', label: 'Read Payments', desc: 'Check receipt and fee balances' }
];

export function ApiKeysTab() {
  const { apiKeys: keys, revokeApiKey, deleteApiKey, generateApiKey } = useIntegration();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Revoked'>('All');
  const [envFilter, setEnvFilter] = useState<'All' | 'Production' | 'Test'>('All');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // New key form state
  const [keyName, setKeyName] = useState('');
  const [environment, setEnvironment] = useState<'Production' | 'Test'>('Production');
  const [rateLimit, setRateLimit] = useState<number>(100);
  const [expiration, setExpiration] = useState<string>('never');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['*']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Visibility toggles
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const filteredKeys = useMemo(() => {
    return keys.filter(k => {
      const matchesSearch =
        k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        k.keyPrefix.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || k.status === statusFilter;
      const matchesEnv = envFilter === 'All' || (k.environment || 'Production') === envFilter;
      return matchesSearch && matchesStatus && matchesEnv;
    });
  }, [keys, searchQuery, statusFilter, envFilter]);

  const activeCount = keys.filter(k => k.status === 'Active').length;
  const revokedCount = keys.filter(k => k.status === 'Revoked').length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Please enter a descriptive key name');
      return;
    }

    try {
      setIsSubmitting(true);
      const days = expiration === 'never' ? 'never' : parseInt(expiration, 10);
      const permissions: ('read' | 'write' | 'admin')[] = selectedScopes.includes('*')
        ? ['read', 'write', 'admin']
        : ['read', 'write'];

      const result = await generateApiKey(
        keyName.trim(),
        permissions,
        environment,
        rateLimit,
        days,
        selectedScopes
      );

      if (result?.rawKey) {
        setRevealedKey(result.rawKey);
        setIsCreateModalOpen(false);
        // Reset form
        setKeyName('');
        setEnvironment('Production');
        setRateLimit(100);
        setExpiration('never');
        setSelectedScopes(['*']);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleScope = (scopeId: string) => {
    if (scopeId === '*') {
      setSelectedScopes(['*']);
      return;
    }

    setSelectedScopes(prev => {
      const withoutAll = prev.filter(s => s !== '*');
      if (withoutAll.includes(scopeId)) {
        const next = withoutAll.filter(s => s !== scopeId);
        return next.length === 0 ? ['*'] : next;
      } else {
        return [...withoutAll, scopeId];
      }
    });
  };

  const downloadEnvSnippet = (key: string) => {
    const content = `# Edvix Admission CRM API Key\nEDVIX_API_KEY="${key}"\nEDVIX_API_URL="https://crm.edvix.in/api/v1"\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env.edvix';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded .env.edvix');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-primary/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">API Credentials</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              REST v1
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Authorize programmatic lead ingestion, partner portals, and automated admission workflows with secure bearer tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-muted/40 px-3 py-2 rounded-xl border border-border">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground">{activeCount}</span>
              <span className="text-muted-foreground">Active</span>
            </div>
            <div className="w-px h-3.5 bg-border mx-1" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="font-semibold text-foreground">{revokedCount}</span>
              <span className="text-muted-foreground">Revoked</span>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter keys by name or prefix..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs">
            {(['All', 'Active', 'Revoked'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-all',
                  statusFilter === tab
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-xs">
            {(['All', 'Production', 'Test'] as const).map(env => (
              <button
                key={env}
                onClick={() => setEnvFilter(env)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium transition-all',
                  envFilter === env
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {env}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">API Key Name & Environment</th>
                <th className="px-5 py-3.5">Secret Prefix</th>
                <th className="px-5 py-3.5">Permissions & Scopes</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Rate Limit</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredKeys.map(key => {
                const isRevealed = visibleKeyIds[key.id];
                const isCopied = copiedKeyId === key.id;
                const isRevoked = key.status === 'Revoked';
                const isTest = key.environment === 'Test' || key.keyPrefix.includes('test');

                return (
                  <tr
                    key={key.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors group',
                      isRevoked && 'opacity-60 bg-muted/10'
                    )}
                  >
                    {/* Name & Env */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border font-bold text-xs',
                            isTest
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          )}
                        >
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {key.name}
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                                isTest
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              )}
                            >
                              {isTest ? 'Sandbox' : 'Production'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px]">{key.id.slice(0, 8)}...</span>
                            {key.expiresAt ? (
                              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                                <Clock className="w-3 h-3" />
                                Expires {new Date(key.expiresAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Never expires</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Prefix */}
                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-2 bg-muted/50 border border-border px-2.5 py-1 rounded-lg font-mono text-xs text-foreground">
                        <span>
                          {isRevealed
                            ? `${key.keyPrefix}_••••••••••••••••`
                            : `${key.keyPrefix}...`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleKeyIds(prev => ({ ...prev, [key.id]: !prev[key.id] }))
                          }
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title={isRevealed ? 'Hide prefix' : 'Show prefix'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(key.keyPrefix, key.id)}
                          className="text-muted-foreground hover:text-foreground p-0.5"
                          title="Copy prefix"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Scopes */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(key.scopes && key.scopes.length > 0 ? key.scopes : ['*']).map((scope, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            key.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            key.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          )}
                        >
                          {key.status}
                        </span>
                      </div>
                    </td>

                    {/* Rate Limit */}
                    <td className="px-5 py-4 text-xs font-medium text-muted-foreground">
                      <span className="font-mono text-foreground">{key.rateLimit || 100}</span> req/min
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(key.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {key.status === 'Active' ? (
                          <button
                            onClick={() => setKeyToRevoke(key)}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => setKeyToDelete(key)}
                            className="text-muted-foreground hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredKeys.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <Key className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No API keys match your criteria</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? 'Try clearing your search query' : 'Generate an API key to start connecting third-party platforms.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Guidance Card */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4.5 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-bold">Credential Hardening Best Practices:</span> API keys carry full authorization to write directly to your admissions pipeline. Never commit keys to GitHub, client-side React bundles, or public websites. Rotate keys every 90 days and revoke compromised tokens immediately.
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: GENERATE NEW KEY MODAL                           */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Generate New API Key</h3>
                  <p className="text-xs text-muted-foreground">Configure permissions and rate limits for external integration.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Key Name */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Key Name / Integration Source *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shiksha Portal Inbound, Campus Walkin Kiosk, Zapier Sync"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                />
              </div>

              {/* Environment Selection */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Environment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setEnvironment('Production')}
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      environment === 'Production'
                        ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="mt-0.5">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center',
                          environment === 'Production' ? 'border-emerald-500' : 'border-muted-foreground'
                        )}
                      >
                        {environment === 'Production' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">Production</div>
                      <div className="text-xs text-muted-foreground">Affects live student leads & metrics</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setEnvironment('Test')}
                    className={cn(
                      'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                      environment === 'Test'
                        ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="mt-0.5">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center',
                          environment === 'Test' ? 'border-amber-500' : 'border-muted-foreground'
                        )}
                      >
                        {environment === 'Test' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">Test / Sandbox</div>
                      <div className="text-xs text-muted-foreground">Safe testing with mock lead isolation</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Expiration & Rate Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Expiration
                  </label>
                  <select
                    value={expiration}
                    onChange={e => setExpiration(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    <option value="never">Never Expire</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days (Recommended)</option>
                    <option value="180">180 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Rate Limit (Req/Min)
                  </label>
                  <select
                    value={rateLimit}
                    onChange={e => setRateLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
                  >
                    <option value="60">60 req / min (Standard)</option>
                    <option value="100">100 req / min (Default)</option>
                    <option value="300">300 req / min (High Throughput)</option>
                    <option value="1000">1,000 req / min (Enterprise)</option>
                  </select>
                </div>
              </div>

              {/* Scopes & Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Permissions & Access Scopes
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedScopes(['*'])}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Select Full Access
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_SCOPES.map(scope => {
                    const isChecked = selectedScopes.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        onClick={() => toggleScope(scope.id)}
                        className={cn(
                          'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs',
                          isChecked
                            ? 'bg-primary/5 border-primary/40 text-foreground'
                            : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{scope.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">({scope.id})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{scope.desc}</div>
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

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2 rounded-xl text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Create API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: NEW KEY REVEAL DIALOG                            */}
      {/* ========================================================= */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-emerald-500/30 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-b from-emerald-500/10 to-transparent">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Your New API Key is Ready</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Please copy and securely store this key now. For your protection,{' '}
                <strong className="text-foreground">it will never be displayed again</strong>.
              </p>

              {/* Key display box */}
              <div className="mt-4 bg-background border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                <code className="font-mono text-xs text-emerald-600 dark:text-emerald-400 break-all select-all font-bold">
                  {revealedKey}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedKey);
                    toast.success('API Key copied to clipboard');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg shrink-0 transition-colors"
                  title="Copy Key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadEnvSnippet(revealedKey)}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-2 px-3 rounded-xl text-xs border border-border flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .env Snippet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Authorization: Bearer ${revealedKey}`);
                    toast.success('Copied curl Authorization header');
                  }}
                  className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold py-2 px-3 rounded-xl text-xs border border-border flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Copy Auth Header
                </button>
              </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setRevealedKey(null)}
                className="bg-foreground text-background font-semibold px-5 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                I have securely saved this key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REVOKE CONFIRMATION DIALOG                       */}
      {/* ========================================================= */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Revoke API Key?</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Are you sure you want to revoke <strong className="text-foreground">{keyToRevoke.name}</strong>? Any webhooks, automated scripts, or partner portals authenticating with this key will immediately be rejected with <code className="font-mono text-rose-500">401 Unauthorized</code>.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setKeyToRevoke(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await revokeApiKey(keyToRevoke.id);
                  setKeyToRevoke(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-colors"
              >
                Yes, Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: PERMANENT DELETE DIALOG                          */}
      {/* ========================================================= */}
      {keyToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-6 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Delete Key Record?</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              This will permanently remove the audit record of{' '}
              <strong className="text-foreground">{keyToDelete.name}</strong> from your organization. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setKeyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteApiKey(keyToDelete.id);
                  setKeyToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
