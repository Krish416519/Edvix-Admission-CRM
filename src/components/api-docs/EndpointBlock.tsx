import { useState } from 'react';
import { ApiEndpoint } from './ApiEndpoints';
import { Play, Copy, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase'; // to get the project URL

interface EndpointBlockProps {
  endpoint: ApiEndpoint;
  apiKey: string;
}

export const EndpointBlock: React.FC<EndpointBlockProps> = ({ endpoint, apiKey }) => {
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
  const [isRunning, setIsRunning] = useState(false);
  const [actualResponse, setActualResponse] = useState<string | null>(null);
  const [actualStatus, setActualStatus] = useState<number | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

  // Extract path and query params for the interactive test
  // This is a naive implementation for the interactive portal. In a full Swagger UI we'd have inputs for every param.
  const runTest = async () => {
    if (!apiKey) {
      toast.error('Please enter your API Key at the top to test endpoints');
      return;
    }

    setIsRunning(true);
    setActiveTab('response');
    
    try {
      // Build the URL
      const fullUrl = `${supabaseUrl}${endpoint.path.replace('{id}', 'REPLACE_ME_OR_REMOVE')}`;
      
      // We parse the sample request body if it exists, roughly
      let body: any = undefined;
      if (endpoint.method === 'POST' || endpoint.method === 'PATCH' || endpoint.method === 'PUT') {
        // Very naive extraction of JSON body from sample request cURL
        const match = endpoint.sampleRequest?.match(/-d '([\\s\\S]*?)'/);
        if (match && match[1]) {
          try {
            body = match[1];
          } catch (e) { }
        }
      }

      const headers: any = {
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey,
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(fullUrl, {
        method: endpoint.method,
        headers,
        body
      });

      setActualStatus(res.status);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setActualResponse(JSON.stringify(json, null, 2));
      } catch (e) {
        setActualResponse(text);
      }
    } catch (err: any) {
      setActualStatus(500);
      setActualResponse(err.message || 'Network error');
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const displayResponse = actualResponse || endpoint.sampleResponse;

  return (
    <div id={endpoint.id} className="pt-16 pb-16 border-b border-border last:border-0 scroll-mt-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Documentation */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
              ${endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' : ''}
              ${endpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : ''}
              ${endpoint.method === 'PATCH' || endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : ''}
              ${endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : ''}
            `}>
              {endpoint.method}
            </span>
            <code className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {endpoint.path}
            </code>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">{endpoint.title}</h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            {endpoint.description}
          </p>

          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Query Parameters</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-border">
                    {endpoint.parameters.map(p => (
                      <tr key={p.name} className="bg-card">
                        <td className="px-4 py-3 font-mono font-medium text-foreground align-top w-1/3">
                          {p.name}
                          {p.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="text-xs font-mono text-primary/70 mb-1">{p.type}</div>
                          {p.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Body Parameters</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-border">
                    {endpoint.bodyParams.map(p => (
                      <tr key={p.name} className="bg-card">
                        <td className="px-4 py-3 font-mono font-medium text-foreground align-top w-1/3">
                          {p.name}
                          {p.required && <span className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="text-xs font-mono text-primary/70 mb-1">{p.type}</div>
                          {p.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Code & Interactive Console */}
        <div className="sticky top-24 h-fit">
          <div className="bg-[#0f1117] rounded-xl overflow-hidden border border-[#2a2e3d] shadow-2xl">
            {/* Console Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#151822] border-b border-[#2a2e3d]">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('request')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'request' ? 'bg-[#2a2e3d] text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Request
                </button>
                <button 
                  onClick={() => setActiveTab('response')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'response' ? 'bg-[#2a2e3d] text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Response {actualStatus && `(${actualStatus})`}
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => copyToClipboard(activeTab === 'request' ? endpoint.sampleRequest || '' : displayResponse || '')}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a2e3d] rounded-md transition-colors"
                  title="Copy Code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Area */}
            <div className="p-4 overflow-x-auto min-h-[250px] max-h-[400px] overflow-y-auto custom-scrollbar bg-[#0f1117] text-gray-300 text-sm font-mono leading-relaxed">
              {activeTab === 'request' ? (
                <pre><code>{endpoint.sampleRequest}</code></pre>
              ) : (
                <pre><code>{displayResponse}</code></pre>
              )}
            </div>

            {/* Action Bar */}
            <div className="px-4 py-3 bg-[#151822] border-t border-[#2a2e3d] flex justify-between items-center">
              <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                Live API Console
              </div>
              <button 
                onClick={runTest}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Run Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
