import { useState } from 'react';
import { 
  Play, Zap, CheckCircle2, XCircle, Clock, Send, FileJson, 
  RotateCcw, Sparkles, User, AlertCircle, ArrowRight, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { automationService } from '../../lib/automationService';
import { cn } from '../../lib/utils';

interface AutomationSimulatorTabProps {
  onGoToHistory: () => void;
}

const EVENT_PRESETS = [
  {
    event: 'Lead Created',
    name: 'New Inbound B.Tech Lead',
    desc: 'Simulates a prospective student submitting a website form or Shiksha inquiry',
    payload: {
      lead: {
        id: 'sim_lead_btech_01',
        first_name: 'Aditya',
        last_name: 'Kulkarni',
        email: 'aditya.kulkarni@example.com',
        phone: '+91 98765 11223',
        lead_status: 'new',
        status: 'new',
        course: 'B.Tech Computer Science',
        lead_score: 82,
        ai_score: 82,
        city: 'Bengaluru',
        budget: '₹10,00,000'
      }
    }
  },
  {
    event: 'Lead Qualified',
    name: 'High-Intent MBA Candidate Qualified',
    desc: 'Simulates AI or counselor qualification with score > 85',
    payload: {
      lead: {
        id: 'sim_lead_mba_02',
        first_name: 'Neha',
        last_name: 'Singhania',
        email: 'neha.singhania@example.com',
        phone: '+91 98111 22334',
        lead_status: 'qualified',
        status: 'qualified',
        course: 'MBA International Business',
        lead_score: 94,
        ai_score: 94,
        city: 'Mumbai',
        budget: '₹18,00,000'
      }
    }
  },
  {
    event: 'Payment Received',
    name: 'Admission Fee Deposit Received',
    desc: 'Simulates payment gateway webhook confirming ₹50,000 seat booking fee',
    payload: {
      lead: {
        id: 'sim_lead_paid_03',
        first_name: 'Vikram',
        last_name: 'Malhotra',
        email: 'vikram.malhotra@example.com',
        phone: '+91 98222 33445',
        lead_status: 'application_started',
        course: 'B.Des Fashion & Product Design',
        city: 'Delhi'
      },
      payment: {
        id: 'pay_99812736',
        amount: 50000,
        status: 'Paid',
        method: 'UPI',
        transaction_id: 'TXN-EDVIX-8847192'
      }
    }
  },
  {
    event: 'Document Uploaded',
    name: 'Class 12th & Entrance Scorecard Uploaded',
    desc: 'Simulates student uploading documents to the portal',
    payload: {
      lead: {
        id: 'sim_lead_docs_04',
        first_name: 'Ananya',
        last_name: 'Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 97333 44556',
        course: 'B.Sc Data Analytics',
        lead_status: 'application_started'
      },
      document: {
        id: 'doc_cert_4812',
        type: '12th_marksheet',
        verification_status: 'pending'
      }
    }
  }
];

export function AutomationSimulatorTab({ onGoToHistory }: AutomationSimulatorTabProps) {
  const [selectedPreset, setSelectedPreset] = useState(EVENT_PRESETS[0]);
  const [eventName, setEventName] = useState(EVENT_PRESETS[0].event);
  const [jsonText, setJsonText] = useState(JSON.stringify(EVENT_PRESETS[0].payload, null, 2));
  const [isFiring, setIsFiring] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSelectPreset = (preset: typeof EVENT_PRESETS[0]) => {
    setSelectedPreset(preset);
    setEventName(preset.event);
    setJsonText(JSON.stringify(preset.payload, null, 2));
    setSimulationResult(null);
  };

  const handleFireEvent = async () => {
    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(jsonText);
    } catch (e: any) {
      toast.error('Invalid JSON payload: ' + e.message);
      return;
    }

    setIsFiring(true);
    const startTime = Date.now();

    try {
      await automationService.triggerEvent(eventName, parsedPayload);
      const latency = Date.now() - startTime;
      
      setSimulationResult({
        success: true,
        event: eventName,
        latencyMs: Math.max(latency, 24),
        timestamp: new Date().toLocaleTimeString(),
        leadName: parsedPayload.lead ? `${parsedPayload.lead.first_name || ''} ${parsedPayload.lead.last_name || ''}`.trim() : 'Anonymous'
      });

      toast.success(`Trigger "${eventName}" dispatched to Automation Engine!`);
    } catch (err: any) {
      setSimulationResult({
        success: false,
        event: eventName,
        error: err.message || 'Execution failed'
      });
      toast.error('Trigger dispatch failed: ' + err.message);
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-y-auto flex flex-col flex-1 p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Live Automation Simulator &amp; Event Dispatcher
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test and trigger live admission lifecycle events against your active workflows in real-time.
          </p>
        </div>

        <button
          onClick={onGoToHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
        >
          View Execution Logs <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preset Cards */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          1. Choose Admission Event Preset:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EVENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleSelectPreset(preset)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all flex flex-col justify-between",
                selectedPreset.name === preset.name
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                  : "border-border bg-background hover:bg-muted/40"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold text-foreground">
                    {preset.event}
                  </span>
                  {selectedPreset.name === preset.name && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <h4 className="font-semibold text-xs text-foreground">{preset.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{preset.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payload Editor & Execution Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* JSON Editor (2 Cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5" /> Event Payload (JSON)
            </label>
            <button
              onClick={() => setJsonText(JSON.stringify(selectedPreset.payload, null, 2))}
              className="text-[11px] text-muted-foreground hover:text-foreground underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Payload
            </button>
          </div>

          <textarea
            rows={7}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full p-3 font-mono text-xs border border-border rounded-xl bg-muted/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
        </div>

        {/* Dispatch Card & Live Status (1 Col) */}
        <div className="flex flex-col justify-between space-y-4 bg-muted/10 border border-border rounded-xl p-5">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Engine Dispatch</h4>
            
            <div className="p-3 bg-background border border-border rounded-lg space-y-1 text-xs">
              <p className="text-muted-foreground text-[11px]">Active Event Name:</p>
              <p className="font-mono font-bold text-primary">{eventName}</p>
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <p>• Triggers all active workflows listening to <code className="text-primary font-mono">{eventName}</code>.</p>
              <p>• Evaluates criteria against this simulated payload.</p>
              <p>• Appends execution record directly to the database audit table.</p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleFireEvent}
            disabled={isFiring}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isFiring ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {isFiring ? 'Dispatching...' : 'Fire Event to Engine'}
          </button>
        </div>
      </div>

      {/* Simulation Result Card */}
      {simulationResult && (
        <div className={cn(
          "p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-300",
          simulationResult.success 
            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800" 
            : "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800"
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                simulationResult.success ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
              )}>
                {simulationResult.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">
                  {simulationResult.success ? 'Trigger Successfully Processed by Automation Engine' : 'Simulation Dispatch Failed'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target Student: <span className="font-semibold text-foreground">{simulationResult.leadName}</span> • Latency: <span className="font-mono font-bold text-foreground">{simulationResult.latencyMs}ms</span> • {simulationResult.timestamp}
                </p>
              </div>
            </div>

            <button
              onClick={onGoToHistory}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Inspect in Logs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
