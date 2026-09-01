import { useState } from 'react';
import { Settings, Link, Terminal, Mail, Key, ShieldCheck, Save, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function IntegrationConfig() {
  const { user } = useAuth();
  const userRole = user?.role;
  const [selectedUniversity, setSelectedUniversity] = useState('');
  
  const canConfig = userRole === 'Admin' || userRole === 'Super Admin';

  if (!canConfig) {
    return (
      <div className="p-12 bg-card border border-border rounded-xl text-center shadow-sm">
        <ShieldCheck className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          University API and Webhook integration configurations are restricted to System Administrators due to sensitive credential storage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integration Config</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage API keys, webhooks, and automation endpoints</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* University List */}
        <div className="w-full md:w-1/3 border-r border-border bg-muted/10">
          <div className="p-4 border-b border-border">
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            >
              <option value="">Select a University...</option>
              <option value="1">Stanford University</option>
              <option value="2">MIT</option>
              <option value="3">Harvard</option>
            </select>
          </div>
          
          <div className="p-4 space-y-2">
            {!selectedUniversity ? (
              <p className="text-sm text-muted-foreground text-center py-8">Select a university to view its integration settings.</p>
            ) : (
              <>
                <button className="w-full flex items-center justify-between p-3 bg-background border border-primary/30 rounded-lg text-left shadow-sm">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-primary">REST API</span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </button>
                <button className="w-full flex items-center justify-between p-3 hover:bg-background border border-transparent hover:border-border rounded-lg text-left transition-colors">
                  <div className="flex items-center gap-3">
                    <Link className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">Inbound Webhooks</span>
                  </div>
                </button>
                <button className="w-full flex items-center justify-between p-3 hover:bg-background border border-transparent hover:border-border rounded-lg text-left transition-colors">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">Email Parsing</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Config Area */}
        <div className="w-full md:w-2/3 p-6 bg-background">
          {!selectedUniversity ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground py-20">
              <Settings className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a university and integration type to configure.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" /> REST API Configuration
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure automated application submission</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-medium rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Base URL</label>
                  <input
                    type="url"
                    defaultValue="https://api.stanford.edu/v1/admissions"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Authentication Method</label>
                    <select className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground">
                      <option>Bearer Token</option>
                      <option>API Key (Header)</option>
                      <option>OAuth 2.0</option>
                      <option>Basic Auth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Environment</label>
                    <select className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground">
                      <option>Production</option>
                      <option>Sandbox / Staging</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Secure Credential Storage</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        API keys are stored encrypted in Supabase Vault and are never accessible to the frontend.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">API Key / Token</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="password"
                        defaultValue="*************************"
                        className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4" /> Connection Status
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    Last tested: 2 hours ago (Success)
                    <button className="flex items-center gap-1.5 text-amber-800 hover:text-amber-900 font-medium">
                      <RefreshCw className="w-3.5 h-3.5" /> Test Connection
                    </button>
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input hover:bg-muted rounded-lg transition-colors">
                  Cancel
                </button>
                <button className="px-5 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
