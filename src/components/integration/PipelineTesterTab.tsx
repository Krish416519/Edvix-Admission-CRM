import { useState } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Flame,
  Clock,
  Layers
} from 'lucide-react';
import { useIntegration } from '../../lib/integrationService';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const SCENARIO_TEMPLATES = [
  {
    id: 'shiksha',
    label: 'Shiksha Lead',
    source: 'Shiksha Portal',
    badge: 'Higher Ed Portal',
    payload: {
      name: 'Riya Sengupta',
      phone: '9812345678',
      email: 'riya.sengupta@example.com',
      course: 'B.Tech Computer Science & AI',
      city: 'Pune',
      state: 'Maharashtra',
      budget: '₹3,50,000 / yr',
      score: 85,
      priority: 'High'
    }
  },
  {
    id: 'collegedunia',
    label: 'CollegeDunia Lead',
    source: 'CollegeDunia',
    badge: 'Exam Aspirant',
    payload: {
      name: 'Devansh Joshi',
      phone: '9823456789',
      email: 'devansh.joshi@example.com',
      course: 'MBA Finance & Analytics',
      city: 'Ahmedabad',
      state: 'Gujarat',
      budget: '₹6,00,000 / yr',
      score: 78,
      priority: 'High'
    }
  },
  {
    id: 'meta_lead',
    label: 'Meta / FB Ad Form',
    source: 'Meta Lead Ads',
    badge: 'Social Campaign',
    payload: {
      name: 'Ananya Deshmukh',
      phone: '9834567890',
      email: 'ananya.deshmukh@example.com',
      course: 'B.Des Fashion & Interior',
      city: 'Mumbai',
      state: 'Maharashtra',
      budget: '₹4,00,000 / yr',
      score: 70,
      priority: 'Medium'
    }
  },
  {
    id: 'google_lead',
    label: 'Google Search Lead',
    source: 'Google Ads Inbound',
    badge: 'High Intent',
    payload: {
      name: 'Vikramaditya Roy',
      phone: '9845678901',
      email: 'vikram.roy@example.com',
      course: 'BCA Cloud & DevOps',
      city: 'Bengaluru',
      state: 'Karnataka',
      budget: '₹2,80,000 / yr',
      score: 92,
      priority: 'High'
    }
  },
  {
    id: 'website_form',
    label: 'Website Direct Form',
    source: 'University Portal Direct',
    badge: 'Organic Walkin',
    payload: {
      name: 'Meera Krishnan',
      phone: '9856789012',
      email: 'meera.krishnan@example.com',
      course: 'B.Sc Biotechnology',
      city: 'Chennai',
      state: 'Tamil Nadu',
      budget: '₹2,20,000 / yr',
      score: 65,
      priority: 'Medium'
    }
  }
];

export function PipelineTesterTab({ onSwitchToLogs }: { onSwitchToLogs: () => void }) {
  const { simulateInboundLead } = useIntegration();
  const navigate = useNavigate();

  const [selectedTemplateId, setSelectedTemplateId] = useState('shiksha');
  const [sourceName, setSourceName] = useState('Shiksha Portal');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(SCENARIO_TEMPLATES[0].payload, null, 2)
  );

  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleSelectTemplate = (template: typeof SCENARIO_TEMPLATES[0]) => {
    setSelectedTemplateId(template.id);
    setSourceName(template.source);
    setPayloadText(JSON.stringify(template.payload, null, 2));
    setResult(null);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setPayloadText(JSON.stringify(parsed, null, 2));
      toast.success('JSON formatted');
    } catch (e) {
      toast.error('Invalid JSON syntax');
    }
  };

  const handleFireWebhook = async () => {
    try {
      const parsed = JSON.parse(payloadText);
      setIsFiring(true);
      const res = await simulateInboundLead(parsed, sourceName);
      setResult(res);
      if (res.status === 'created') {
        toast.success(`New Lead created successfully! (ID: ${res.leadId.slice(0, 8)})`);
      } else {
        toast.success(`Duplicate matched! Lead enriched and merged.`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Simulation failed');
      setResult({ error: e.message || 'Validation error' });
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card via-card to-amber-500/5 p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Inbound Pipeline Simulator</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Live Gateway Mock
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Simulate incoming webhooks and API calls in real-time. Verify duplicate detection rules, phone normalization, lead scoring, and automatic assignment.
          </p>
        </div>

        <button
          onClick={onSwitchToLogs}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 self-start md:self-auto bg-card border border-border px-3 py-2 rounded-xl"
        >
          <span>View Gateway Traffic Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scenario Template Selector */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Choose Pre-Built Inbound Scenario
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {SCENARIO_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                selectedTemplateId === t.id
                  ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                  : 'bg-card border-border hover:bg-muted/30'
              )}
            >
              <div className="font-bold text-xs text-foreground mb-1">{t.label}</div>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md self-start">
                {t.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Code Editor & Live Preview Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: JSON Editor */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Inbound JSON Payload</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleFormatJson}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted"
                title="Format JSON"
              >
                Prettify
              </button>
              <button
                onClick={() => {
                  const t = SCENARIO_TEMPLATES.find(x => x.id === selectedTemplateId);
                  if (t) setPayloadText(JSON.stringify(t.payload, null, 2));
                  setResult(null);
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Source Channel Tag
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-xl text-foreground font-medium"
            />
          </div>

          <div className="relative">
            <textarea
              rows={12}
              value={payloadText}
              onChange={e => setPayloadText(e.target.value)}
              className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleFireWebhook}
            disabled={isFiring}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            {isFiring ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Simulating Ingestion...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Dispatch Simulated Inbound Lead</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Execution Result Preview */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs min-h-[360px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Pipeline Execution Result</span>
                </h3>
                {result && (
                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                      result.status === 'created'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : result.status === 'merged'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                    )}
                  >
                    {result.status === 'created'
                      ? '201 Created (New Lead)'
                      : result.status === 'merged'
                      ? '200 OK (Duplicate Merged)'
                      : 'Error'}
                  </span>
                )}
              </div>

              {!result ? (
                <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Ready for Dispatch</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Click "Dispatch Simulated Inbound Lead" to test deduplication, schema validation, and database insertion.
                  </p>
                </div>
              ) : result.error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Validation Rejected
                  </div>
                  {result.error}
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Lead Card Preview */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {result.lead?.name?.slice(0, 2).toUpperCase() || 'ST'}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{result.lead?.name}</div>
                          <div className="text-xs text-muted-foreground">{result.lead?.course}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Score: {result.lead?.score || 75}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-foreground font-mono">{result.lead?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="text-foreground truncate">{result.lead?.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-foreground">
                          {result.lead?.city || 'Pune'}, {result.lead?.state || 'MH'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-foreground">Source: {sourceName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Response */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                      <span>Gateway Response JSON</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                          setCopiedResponse(true);
                          setTimeout(() => setCopiedResponse(false), 2000);
                        }}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {copiedResponse ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedResponse ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-xl overflow-x-auto max-h-36">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {result?.leadId && (
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <button
                  onClick={onSwitchToLogs}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Verify in Traffic Logs
                </button>

                <button
                  onClick={() => navigate(`/all-leads/${result.leadId}`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Lead Record</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
