
import { Call } from '../../types/telephony';
import { X, Sparkles, CheckSquare, AlertCircle, FileText, Play, Mail, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CallDetailModalProps {
  call: Call;
  onClose: () => void;
}

export function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-border overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Call Details: {call.leadName || 'Unknown'}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>{format(new Date(call.createdAt), 'PPpp')}</span>
              <span>•</span>
              <span>Duration: {formatDuration(call.durationSeconds)}</span>
              <span>•</span>
              <span>Agent: {call.counselorName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: AI & Actions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* AI Summary */}
              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-5">
                <h3 className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" /> AI Summary
                </h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {call.aiSummary || call.notes || 'No summary available.'}
                </p>
              </div>

              {/* Grid for Objections & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-primary" /> Action Items
                  </h3>
                  {call.aiActionItems && call.aiActionItems.length > 0 ? (
                    <ul className="space-y-2">
                      {call.aiActionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No specific action items identified.</p>
                  )}
                </div>

                <div className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-500" /> Objections / Concerns
                  </h3>
                  {call.aiObjections && call.aiObjections.length > 0 ? (
                    <ul className="space-y-2">
                      {call.aiObjections.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No major objections raised.</p>
                  )}
                </div>
              </div>

              {/* Transcript */}
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Transcript
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {call.transcript ? (
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {call.transcript}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Transcript not available for this call.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Metadata & Comms */}
            <div className="space-y-6">
              
              {/* Metadata */}
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Call Info</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Outcome</span>
                    <span className="font-medium text-foreground">{call.outcome || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Sentiment</span>
                    <span className="font-medium capitalize text-foreground">{call.aiSentiment || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Direction</span>
                    <span className="font-medium capitalize text-foreground">{call.direction}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {call.tags?.length ? call.tags.map(t => (
                        <span key={t} className="bg-muted px-2 py-0.5 rounded text-xs text-foreground">{t}</span>
                      )) : <span className="text-muted-foreground italic">None</span>}
                    </div>
                  </div>
                </div>

                {call.recordingUrl && (
                  <button className="w-full mt-6 py-2 bg-primary/10 text-primary rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-primary/20 transition-colors">
                    <Play className="w-4 h-4" /> Play Recording
                  </button>
                )}
              </div>

              {/* Generated Comms */}
              {(call.aiFollowUpEmail || call.aiWhatsappMessage) && (
                <div className="border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Generated Follow-ups
                  </h3>
                  
                  {call.aiFollowUpEmail && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3"/> Email Draft</span>
                        <button onClick={() => copyToClipboard(call.aiFollowUpEmail!, 'Email')} className="text-xs text-primary hover:underline">Copy</button>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground line-clamp-3">
                        {call.aiFollowUpEmail}
                      </div>
                    </div>
                  )}

                  {call.aiWhatsappMessage && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3"/> WhatsApp Draft</span>
                        <button onClick={() => copyToClipboard(call.aiWhatsappMessage!, 'WhatsApp')} className="text-xs text-primary hover:underline">Copy</button>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-3 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
                        {call.aiWhatsappMessage}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
