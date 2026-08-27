import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Copy, CheckCircle2, AlertTriangle, Plus, Trash2, Eye, EyeOff, RefreshCw, ShieldCheck, Activity } from 'lucide-react';
import { ApiAnalytics } from './ApiAnalytics';
import { toast } from 'sonner';
import { useConfirm } from '../ConfirmDialog';

export function DeveloperSettings() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New key state
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['*']);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [environment, setEnvironment] = useState<'Production' | 'Test'>('Production');
  const [rateLimit, setRateLimit] = useState<number>(100);
  const [expiration, setExpiration] = useState<string>('never');

  const AVAILABLE_SCOPES = [
    { id: '*', label: 'Full Access (Admin)' },
    { id: 'lead:read', label: 'Read Leads' },
    { id: 'lead:create', label: 'Create Leads' },
    { id: 'lead:update', label: 'Update Leads' },
    { id: 'admission:read', label: 'Read Admissions' },
    { id: 'admission:create', label: 'Create Admissions' },
    { id: 'application:read', label: 'Read Applications' },
    { id: 'application:update', label: 'Update Applications' },
    { id: 'document:read', label: 'Read Documents' },
    { id: 'document:create', label: 'Upload Documents' },
    { id: 'payment:read', label: 'Read Payments' },
    { id: 'payment:update', label: 'Update Payments' },
    { id: 'invoice:read', label: 'Read Invoices' },
  ];
  
  // Webhooks State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookName, setNewWebhookName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['admission.confirmed']);
  const [visibleWebhookSecrets, setVisibleWebhookSecrets] = useState<Record<string, boolean>>({});
  const [isRotating, setIsRotating] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'analytics'>('analytics');
  
  const AVAILABLE_EVENTS = [
    'lead.created', 'lead.updated', 'lead.assigned', 
    'lead.qualified', 'lead.lost', 'lead.converted', 
    'admission.created', 'admission.submitted', 'admission.approved', 
    'admission.rejected', 'admission.confirmed',
    'document.uploaded', 'document.verified', 'document.rejected', 'document.missing',
    'payment.created', 'payment.success', 'payment.failed', 'payment.refunded',
    'task.created', 'task.completed', 'task.overdue'
  ];

  useEffect(() => {
    if (user?.activeOrganizationId) {
      loadApiKeys();
      loadWebhooks();
    }
  }, [user?.activeOrganizationId]);

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', user!.activeOrganizationId!)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  };

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('organization_id', user!.activeOrganizationId!)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    
    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission for this API key');
      return;
    }

    try {
      setIsGenerating(true);
      
      const randomString = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
        
      const rawKey = environment === 'Test' ? `edvix_test_${randomString}` : `edvix_live_${randomString}`;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      let expirationDate = null;
      if (expiration !== 'never') {
         const date = new Date();
         date.setDate(date.getDate() + parseInt(expiration));
         expirationDate = date.toISOString();
      }

      const { error } = await supabase
        .from('api_keys')
        .insert({
          organization_id: user!.activeOrganizationId!,
          name: newKeyName.trim(),
          key_prefix: environment === 'Test' ? 'edvix_test' : 'edvix_live',
          key_hash: hashHex,
          permissions: selectedPermissions,
          environment: environment,
          rate_limit: rateLimit,
          expires_at: expirationDate,
          created_by: user?.id,
          status: 'Active'
        });

      if (error) throw error;

      setGeneratedKey(rawKey);
      setNewKeyName('');
      setSelectedPermissions(['*']);
      setEnvironment('Production');
      setRateLimit(100);
      setExpiration('never');
      setIsAddingKey(false);
      toast.success('API Key generated successfully');
      loadApiKeys();
      
    } catch (error: any) {
      console.error('Error generating key:', error);
      toast.error(`Failed to generate API key: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!await confirm({
      title: 'Revoke API Key',
      message: 'Are you sure you want to revoke this API key? Any applications using it will instantly lose access.',
      confirmLabel: 'Revoke',
      variant: 'danger'
    })) return;
    
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ status: 'Revoked' })
        .eq('id', id);
        
      if (error) throw error;
      toast.success('API Key revoked');
      loadApiKeys();
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const addWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast.error('Please enter a name and URL for the webhook');
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    try {
      setIsAddingWebhook(true);
      
      const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
        
      const secret = `whsec_${randomString}`;

      const { error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: user!.activeOrganizationId!,
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
          events: selectedEvents,
          secret: secret,
          status: 'Active'
        });

      if (error) throw error;
      
      setNewWebhookName('');
      setNewWebhookUrl('');
      setSelectedEvents(['admission.confirmed']);
      toast.success('Webhook endpoint added successfully');
      loadWebhooks();
    } catch (error) {
      console.error('Error adding webhook:', error);
      toast.error('Failed to add webhook');
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const removeWebhook = async (id: string) => {
    if (!await confirm({
      title: 'Remove Webhook',
      message: 'Are you sure you want to remove this webhook? Partner systems will stop receiving updates.',
      confirmLabel: 'Remove',
      variant: 'danger'
    })) return;
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Webhook removed');
      loadWebhooks();
    } catch (error) {
      toast.error('Failed to remove webhook');
    }
  };

  const rotateWebhookSecret = async (id: string) => {
    if (!await confirm({
      title: 'Rotate Webhook Secret',
      message: 'Are you sure you want to rotate this webhook secret? You must immediately update your partner application with the new secret to verify payloads.',
      confirmLabel: 'Rotate',
      variant: 'warning'
    })) return;
    
    try {
      setIsRotating(prev => ({ ...prev, [id]: true }));
      
      const { data, error } = await supabase.rpc('rotate_webhook_secret', {
        p_webhook_id: id
      });
      
      if (error) throw error;
      
      toast.success('Webhook secret rotated successfully');
      loadWebhooks();
      setVisibleWebhookSecrets(prev => ({ ...prev, [id]: true }));
    } catch (error: any) {
      console.error('Error rotating secret:', error);
      toast.error('Failed to rotate webhook secret');
    } finally {
      setIsRotating(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleWebhookSecretVisibility = (id: string) => {
    setVisibleWebhookSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developer Settings</h1>
        <p className="text-muted-foreground">Manage Public API Keys, Webhook Endpoints, and Analytics.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            API Analytics
          </div>
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'keys' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </div>
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'webhooks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Webhooks
          </div>
        </button>
      </div>

      {activeTab === 'analytics' && <ApiAnalytics />}

      {activeTab === 'keys' && (
        <div className="space-y-6">
          {generatedKey && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-400 mb-2">
                    New API Key Generated
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-500 mb-4">
                    Please copy this key and store it securely. For security reasons, <strong>we cannot show it to you again</strong>.
                  </p>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-2">
                    <code className="flex-1 text-sm px-2 font-mono">{generatedKey}</code>
                    <button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                  <button
                    onClick={() => setGeneratedKey(null)}
                    className="mt-4 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    I have saved my key
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  API Keys
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use API keys to authenticate external applications via our REST API.
                </p>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isAddingKey && (
                  <button
                    onClick={() => setIsAddingKey(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    New API Key
                  </button>
                )}
              </div>
            </div>

            {isAddingKey && (
              <div className="p-6 bg-muted/30 border-b border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Key Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Website Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Environment</label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value as 'Production' | 'Test')}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Production">Production</option>
                      <option value="Test">Test (Sandbox)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={rateLimit}
                      onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiration</label>
                    <select
                      value={expiration}
                      onChange={(e) => setExpiration(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="never">Never</option>
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                      <option value="365">1 Year</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <label key={scope.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-background cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-input text-primary focus:ring-primary"
                          checked={selectedPermissions.includes(scope.id)}
                          onChange={(e) => {
                            if (scope.id === '*') {
                              setSelectedPermissions(e.target.checked ? ['*'] : []);
                              return;
                            }
                            
                            let next = [...selectedPermissions].filter(id => id !== '*');
                            if (e.target.checked) {
                              next.push(scope.id);
                            } else {
                              next = next.filter(id => id !== scope.id);
                            }
                            setSelectedPermissions(next);
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium">{scope.label}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{scope.id}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={generateApiKey}
                    disabled={isGenerating || !newKeyName.trim() || selectedPermissions.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <CheckCircle2 className="w-4 h-4" />}
                    Generate Key
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingKey(false);
                      setNewKeyName('');
                      setSelectedPermissions(['*']);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading API Keys...</div>
            ) : apiKeys.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Environment</th>
                    <th className="px-6 py-4">Prefix</th>
                    <th className="px-6 py-4">Permissions</th>
                    <th className="px-6 py-4">Rate Limit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{key.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${key.environment === 'Production' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                           {key.environment || 'Production'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{key.key_prefix}••••••••</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {key.permissions?.includes('*') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">Full Access</span>
                          ) : key.permissions?.map((p: string) => (
                            <span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary/50 text-secondary-foreground border border-border">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">{key.rate_limit || 100} / min</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                          key.status === 'Active' 
                            ? (key.expires_at && new Date(key.expires_at) < new Date() 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400')
                            : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                        }`}>
                          {key.status === 'Active' && key.expires_at && new Date(key.expires_at) < new Date() ? 'Expired' : key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.status === 'Active' && (
                          <button
                            onClick={() => revokeKey(key.id)}
                            className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center border-t border-border">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No API Keys</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You haven't generated any API keys yet. Create one above to allow external applications to interact with your CRM data.
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Using your API Key</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  To authenticate requests to the Edvix Public API, include the API key in the Authorization header of your HTTP requests:
                </p>
                <code className="block mt-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-500/30 rounded px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200">
                  Authorization: Bearer edvix_live_your_api_key_here
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Outbound Webhooks
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Notify external Partner systems in real-time when events occur in the CRM (e.g. Admission Confirmed).
                </p>
              </div>
              
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Name (e.g., Partner System)"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    className="w-1/3 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="url"
                    placeholder="https://partner.com/api/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map(evt => (
                    <label key={evt} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedEvents.includes(evt)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEvents(prev => [...prev, evt]);
                          else setSelectedEvents(prev => prev.filter(e => e !== evt));
                        }}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="text-muted-foreground">{evt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={addWebhook}
                disabled={isAddingWebhook || !newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-start sm:self-center"
              >
                {isAddingWebhook ? <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Plus className="w-4 h-4" />}
                Add Endpoint
              </button>
            </div>

            {webhooks.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Endpoint</th>
                    <th className="px-6 py-4">Events</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium">{webhook.name}</p>
                        <p className="text-xs text-muted-foreground">{webhook.url}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground border border-border inline-flex items-center gap-2 min-w-[200px]">
                            {visibleWebhookSecrets[webhook.id] ? webhook.secret : '••••••••••••••••••••••••••••••••'}
                            <button
                              onClick={() => toggleWebhookSecretVisibility(webhook.id)}
                              className="ml-auto hover:text-foreground transition-colors"
                              title={visibleWebhookSecrets[webhook.id] ? "Hide Secret" : "Show Secret"}
                            >
                              {visibleWebhookSecrets[webhook.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <button
                            onClick={() => copyToClipboard(webhook.secret)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Secret"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {webhook.events.map((ev: string) => (
                            <span key={ev} className="px-2 py-0.5 bg-secondary/50 text-secondary-foreground rounded-md text-[10px] font-medium border border-border">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-[10px] font-medium uppercase tracking-wider">
                          {webhook.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => rotateWebhookSecret(webhook.id)}
                            disabled={isRotating[webhook.id]}
                            className="text-amber-600 hover:text-amber-700 p-2 rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                            title="Rotate Secret"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRotating[webhook.id] ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => removeWebhook(webhook.id)}
                            className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Remove Webhook"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center border-t border-border">
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No webhook endpoints configured. Add an endpoint to start pushing real-time events.
                </p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-6 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Verifying Webhooks</h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                  For security, webhooks are sent via HTTPS and signed with your webhook's secret. Verify the payload to ensure it came from Edvix and prevent replay attacks:
                </p>
                <code className="block mt-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-500/30 rounded px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                  // Verify HMAC SHA-256<br />
                  Signature = HMAC(Timestamp + "." + Payload, Secret)<br /><br />
                  X-Edvix-Signature: (hex string)<br />
                  X-Edvix-Timestamp: (unix timestamp)
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
