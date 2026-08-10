import React, { useState, useEffect } from 'react';
import { Cpu, Save, Settings2, SlidersHorizontal, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAiConfig, updateAiConfig } from '../../lib/adminService';
import { toast } from 'sonner';

export function AiSettings() {
  const [config, setConfig] = useState<any>({
    provider: 'OpenAI',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    max_tokens: 2000,
    api_key: ''
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchAiConfig();
      setConfig(data);
    } catch (err) {
      console.error('No AI config found or failed to load');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAiConfig(config);
      toast.success('AI Configuration saved successfully');
      fetchConfig();
    } catch (err: any) {
      toast.error('Failed to save configuration');
    }
  };

  const currentUsage = config.currentUsage || 0;
  const usageLimitMonthly = config.usageLimitMonthly || 50000;
  const usagePercent = usageLimitMonthly > 0 ? (currentUsage / usageLimitMonthly) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-500" />
          AI Configuration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage AI providers, token limits, and prompt templates for the CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6 pb-2 border-b border-border">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              Provider Settings
            </h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">AI Provider</label>
                  <select 
                    value={config.provider}
                    onChange={e => setConfig({...config, provider: e.target.value as any})}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option>OpenAI</option>
                    <option>Anthropic</option>
                    <option>Google Gemini</option>
                    <option>OpenRouter</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Model</label>
                  <select 
                    value={config.model}
                    onChange={e => setConfig({...config, model: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option>gpt-4-turbo</option>
                    <option>gpt-3.5-turbo</option>
                    <option>claude-3-opus</option>
                    <option>gemini-1.5-pro</option>
                    <option>inclusionai/ling-3.0-tiny:free</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">API Key</label>
                <input 
                  type="password" 
                  value={config.api_key || ''}
                  onChange={e => setConfig({...config, api_key: e.target.value})}
                  placeholder="sk-proj-**********************************" 
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm" 
                />
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  Model Parameters
                </h4>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium block">Temperature</label>
                      <span className="text-xs text-muted-foreground">{config.temperature}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={config.temperature}
                      onChange={e => setConfig({...config, temperature: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground">Lower = focused, Higher = creative.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Max Tokens</label>
                    <input 
                      type="number" 
                      value={config.max_tokens}
                      onChange={e => setConfig({...config, max_tokens: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              Token Usage
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-muted-foreground">Monthly Quota</span>
                  <span className="text-sm font-bold text-foreground">{Math.round(usagePercent)}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${usagePercent > 85 ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Used</p>
                  <p className="font-mono text-sm mt-1">{(currentUsage / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Limit</p>
                  <p className="font-mono text-sm mt-1">{(usageLimitMonthly / 1000000).toFixed(0)}M</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
