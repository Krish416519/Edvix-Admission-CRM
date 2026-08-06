import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TelephonyProvider, TelephonyProviderType } from '../../types/telephony';
import { Server, Save, Plus, Trash2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const PROVIDER_TYPES: TelephonyProviderType[] = [
  'Twilio', 'Exotel', 'Knowlarity', 'MyOperator', 'CloudTalk', 'CustomSIP'
];

export function ProviderSettings() {
  const [providers, setProviders] = useState<TelephonyProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TelephonyProviderType>('CustomSIP');
  const [newConfig, setNewConfig] = useState('{\n  "endpoint": "sip:example.com",\n  "username": "",\n  "password": ""\n}');

  const fetchProviders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('telephony_providers').select('*').order('created_at', { ascending: true });
    if (error) {
      toast.error('Failed to load providers');
    } else {
      setProviders(data.map(p => ({
        id: p.id,
        name: p.name,
        providerType: p.provider_type as TelephonyProviderType,
        config: p.config,
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleToggleActive = async (id: string) => {
    await supabase.from('telephony_providers').update({ is_active: false }).neq('id', id);
    const { error } = await supabase.from('telephony_providers').update({ is_active: true }).eq('id', id);
    
    if (error) toast.error('Failed to update active provider');
    else {
      toast.success('Active provider updated');
      fetchProviders();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this provider configuration?')) return;
    const { error } = await supabase.from('telephony_providers').delete().eq('id', id);
    if (error) toast.error('Failed to delete provider');
    else {
      toast.success('Provider deleted');
      fetchProviders();
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Provider name is required');
      return;
    }

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(newConfig);
    } catch (e) {
      toast.error('Invalid JSON configuration');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('telephony_providers').insert([{
      name: newName,
      provider_type: newType,
      config: parsedConfig,
      is_active: providers.length === 0 // Make active if it's the first one
    }]);

    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to add provider: ' + error.message);
    } else {
      toast.success('Provider added successfully');
      setIsModalOpen(false);
      setNewName('');
      setNewConfig('{\n  "endpoint": "sip:example.com",\n  "username": "",\n  "password": ""\n}');
      fetchProviders();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="p-6 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> Telephony Providers
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No telephony providers configured.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Configure your first provider
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map(provider => (
              <div key={provider.id} className={`border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${provider.isActive ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-foreground">{provider.name}</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded uppercase font-medium">{provider.providerType}</span>
                    {provider.isActive && <span className="flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold"><CheckCircle className="w-3 h-3"/> ACTIVE</span>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">ID: {provider.id}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {!provider.isActive && (
                    <button 
                      onClick={() => handleToggleActive(provider.id)}
                      className="text-sm px-3 py-1.5 border border-border bg-card hover:bg-muted text-foreground rounded font-medium transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button className="text-sm px-3 py-1.5 border border-border bg-card hover:bg-muted text-foreground rounded font-medium transition-colors opacity-50 cursor-not-allowed" title="Editing coming soon">
                    Edit Config
                  </button>
                  <button 
                    onClick={() => handleDelete(provider.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold text-lg text-foreground">Add Telephony Provider</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddProvider} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Provider Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Twilio Primary"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Provider Type</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as TelephonyProviderType)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  {PROVIDER_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Configuration (JSON)</label>
                <textarea 
                  value={newConfig}
                  onChange={(e) => setNewConfig(e.target.value)}
                  className="w-full h-32 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Provide API keys, SID, or SIP credentials in JSON format.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4"/> Save Provider</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
