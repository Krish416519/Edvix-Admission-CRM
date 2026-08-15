import React, { useState } from 'react';
import { Key, Copy, Plus, Trash2, Shield, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { ApiKey } from '../../types/integration';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export function ApiKeysTab() {
  const { apiKeys: keys, revokeApiKey, generateApiKey } = useIntegration();
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      const result = await generateApiKey('New Integration Key', ['*']);
      if (result?.rawKey) {
        setGeneratedKey(result.rawKey);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            API Keys
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage API keys used to authenticate external lead sources.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      </div>

      {generatedKey && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
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
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium text-muted-foreground">Name</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Key Prefix</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
              <th className="px-6 py-4 font-medium text-muted-foreground">Created</th>
              <th className="px-6 py-4 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {keys.map(key => (
              <tr key={key.id} className={cn("transition-colors", key.status === 'Revoked' && "opacity-50")}>
                <td className="px-6 py-4 font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  {key.name}
                </td>
                <td className="px-6 py-4 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {showKeyId === key.id ? `${key.keyPrefix}****************` : `${key.keyPrefix}...`}
                    <button onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)} className="text-muted-foreground hover:text-foreground">
                      {showKeyId === key.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => copyToClipboard(key.keyPrefix)} className="text-muted-foreground hover:text-foreground">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    key.status === 'Active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                    key.status === 'Revoked' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  )}>
                    {key.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(key.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {key.status === 'Active' && (
                    <button 
                      onClick={() => handleRevoke(key.id)}
                      className="text-red-500 hover:text-red-600 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">Security Notice</p>
          <p>API keys provide full write access to your CRM's Lead Capture endpoints. Never expose them in public repositories or frontend code. If you suspect a key is compromised, revoke it immediately.</p>
        </div>
      </div>
    </div>
  );
}
