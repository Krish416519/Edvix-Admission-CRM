import React, { useState } from 'react';
import { 
  Send, Paperclip, X, Bold, Italic, List, Link as LinkIcon, 
  Sparkles, Maximize2, Minimize2, Eye, ChevronDown, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEmail } from '../../hooks/useEmail';
import { toast } from 'sonner';
import { Lead } from '../../types/schema';

interface EmailComposerProps {
  onClose?: () => void;
  lead?: Lead;
  defaultRecipient?: string;
  defaultSubject?: string;
  defaultBody?: string;
}

export function EmailComposer({ onClose, lead, defaultRecipient = '', defaultSubject = '', defaultBody = '' }: EmailComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipient || (lead?.email ?? ''));
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isGenerating, setIsGenerating] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const { sendEmail, saveDraft, isSending, templates, generateSubject, improveTone } = useEmail();

  const handleSend = async () => {
    if (!recipient || !subject || !body) {
      toast.error('Please fill in recipient, subject, and body');
      return;
    }

    await sendEmail({
      recipientEmail: recipient,
      recipientName: lead?.name || recipient.split('@')[0],
      subject,
      body: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      snippet: body.substring(0, 100),
      trackingEnabled,
      leadId: lead?.id,
    });

    if (onClose) onClose();
  };

  const handleSaveDraft = async () => {
    await saveDraft({
      recipientEmail: recipient,
      subject,
      body: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      leadId: lead?.id,
    });
  };

  const handleAITone = async () => {
    if (!body) return;
    setIsGenerating(true);
    try {
      const improved = await improveTone(body);
      setBody(improved.replace(/<[^>]*>/g, '\n').trim());
      toast.success('Tone improved');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAISubject = async () => {
    setIsGenerating(true);
    try {
      const genSubject = await generateSubject(body);
      setSubject(genSubject);
      toast.success('Subject generated');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseTemplate = (template: { subject_template: string; body_template: string }) => {
    const vars: Record<string, string> = {
      student_name: lead?.name || 'Student',
      course: typeof lead?.course === 'string' ? lead.course : (lead?.course as any)?.name || 'your course',
      university: typeof lead?.university === 'string' ? lead.university : (lead?.university as any)?.name || 'the university',
      counselor: 'Your Counselor',
    };

    const rendered = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);
    setSubject(rendered(template.subject_template));
    setBody(rendered(template.body_template).replace(/<[^>]*>/g, '\n').trim());
    setShowTemplates(false);
  };

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border shadow-2xl transition-all duration-300",
      onClose ? "fixed bottom-4 right-4 rounded-xl z-50 overflow-hidden" : "w-full h-full rounded-xl",
      onClose && (isExpanded ? "w-[800px] h-[620px]" : "w-[520px] h-[520px]")
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="font-semibold text-sm">New Message</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors",
              showTemplates ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Templates <ChevronDown className="w-3 h-3" />
          </button>
          {onClose && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div className="border-b border-border bg-muted/20 p-2 max-h-40 overflow-y-auto custom-scrollbar">
          <div className="grid gap-1">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => handleUseTemplate(t)}
                className="text-left px-3 py-2 rounded-lg hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-colors text-sm"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground text-xs ml-2">({t.category})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* To Field */}
      <div className="border-b border-border px-4 py-2 flex items-center">
        <span className="text-muted-foreground text-sm w-12">To:</span>
        <input 
          type="email" 
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-0" 
          placeholder="student@example.com"
        />
      </div>

      {/* Subject Field */}
      <div className="border-b border-border px-4 py-2 flex items-center relative group">
        <span className="text-muted-foreground text-sm w-12">Subject:</span>
        <input 
          type="text" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm focus:ring-0 font-medium pr-10" 
          placeholder="Enter subject"
        />
        <button 
          onClick={handleAISubject}
          disabled={isGenerating}
          className="absolute right-4 p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          title="AI Generate Subject"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/10">
        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Bold className="w-4 h-4" /></button>
        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><Italic className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-border mx-1"></div>
        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><List className="w-4 h-4" /></button>
        <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"><LinkIcon className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-border mx-1"></div>
        <button 
          onClick={handleAITone}
          disabled={isGenerating || !body}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-md transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Improve Tone
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 relative">
        <textarea 
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-full resize-none bg-transparent border-none outline-none text-sm text-foreground"
          placeholder="Write your email here..."
        />
        {isGenerating && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-2 text-primary font-medium bg-background px-4 py-2 rounded-full shadow-lg border border-primary/20">
              <Sparkles className="w-4 h-4 animate-pulse" />
              AI is writing...
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSend}
            disabled={isSending || isGenerating}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button 
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors text-xs"
            title="Save as Draft"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={() => setTrackingEnabled(!trackingEnabled)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
            trackingEnabled ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"
          )}
          title="Toggle Open/Click Tracking"
        >
          <Eye className="w-3.5 h-3.5" />
          Tracking {trackingEnabled ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  );
}
