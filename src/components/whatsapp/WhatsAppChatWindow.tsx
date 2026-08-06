import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Check, CheckCheck, Clock, FileText, Bot, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWhatsApp, WAMessage, WATemplate } from '../../hooks/useWhatsApp';
import { useAuth } from '../../contexts/AuthContext';
import { ContentGenerator } from '../../lib/ai/ContentGenerator';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function WhatsAppChatWindow({ conversationId, leadId }: { conversationId: string, leadId?: string }) {
  const { user } = useAuth();
  const { messages, templates, sendMessage, isSending } = useWhatsApp(conversationId);
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    await sendMessage(conversationId, text, 'text', isInternalNote);
  };

  const handleSendTemplate = async (template: WATemplate) => {
    setShowTemplates(false);
    await sendMessage(conversationId, template.content, 'template', false, template.id);
  };

  const handleAIDraft = async () => {
    if (!leadId) {
      toast.error('Lead ID not found');
      return;
    }
    setIsDrafting(true);
    try {
      const draft = await ContentGenerator.draftMessage(leadId, 'WhatsApp');
      setInputText(draft);
      setIsInternalNote(false);
      toast.success('AI Draft generated');
    } catch (e) {
      toast.error('Failed to generate AI draft');
    } finally {
      setIsDrafting(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'queued': return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent': return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] dark:bg-zinc-950 relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex justify-center">
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs px-4 py-2 rounded-full">
              No messages yet. Start the conversation!
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.sender_type === 'counselor' ? "justify-end" : "justify-start")}>
            <div 
              className={cn(
                "max-w-[85%] rounded-lg p-2.5 relative shadow-sm",
                msg.is_internal_note 
                  ? "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700/50" 
                  : msg.sender_type === 'counselor' 
                    ? "bg-[#dcf8c6] text-slate-800 dark:bg-emerald-900/60 dark:text-emerald-50" 
                    : "bg-white text-slate-800 dark:bg-zinc-900 dark:text-zinc-100"
              )}
            >
              {msg.is_internal_note && <div className="text-[10px] font-bold uppercase mb-1 opacity-70">Internal Note</div>}
              {msg.message_type === 'template' && (
                <div className="text-[10px] font-bold uppercase mb-1 opacity-70 flex items-center gap-1">
                  <Bot className="w-3 h-3"/> Template
                </div>
              )}
              
              <p className="text-sm leading-relaxed whitespace-pre-wrap pr-10">{msg.content}</p>
              
              <div className="absolute bottom-1 right-1.5 flex items-center gap-1 opacity-70">
                <span className="text-[10px] leading-none">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender_type === 'counselor' && !msg.is_internal_note && (
                  <StatusIcon status={msg.status} />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Template Drawer */}
      {showTemplates && (
        <div className="absolute bottom-16 left-0 right-0 bg-background border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Select Template</h3>
            <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid gap-2 max-h-48 overflow-y-auto custom-scrollbar">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No templates found</p>
            )}
            {templates.map(t => (
              <button 
                key={t.id} 
                onClick={() => handleSendTemplate(t)}
                className="text-left p-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
              >
                <div className="font-medium mb-1">{t.name}</div>
                <div className="text-muted-foreground text-xs line-clamp-1">{t.content}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-card border-t border-border flex items-end gap-2 z-20">
        <button 
          onClick={() => setShowTemplates(!showTemplates)}
          className="p-2.5 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"
          title="Templates"
        >
          <Bot className="w-5 h-5" />
        </button>
        <button 
          onClick={handleAIDraft}
          disabled={isDrafting}
          className="p-2.5 text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors shrink-0"
          title="AI Draft Message"
        >
          {isDrafting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        </button>
        <button className="p-2.5 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        
        <div className={cn(
          "flex-1 bg-background border rounded-xl flex items-center overflow-hidden transition-all focus-within:ring-2",
          isInternalNote 
            ? "border-amber-400 focus-within:ring-amber-400/20" 
            : "border-border focus-within:ring-primary/20 focus-within:border-primary"
        )}>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isInternalNote ? "Type an internal note..." : "Type a message..."}
            className={cn(
              "w-full bg-transparent px-3 py-2.5 text-sm resize-none max-h-32 min-h-[44px] outline-none",
              isInternalNote ? "placeholder:text-amber-500/50" : "placeholder:text-muted-foreground"
            )}
            rows={1}
          />
        </div>

        <button 
          onClick={() => setIsInternalNote(!isInternalNote)}
          className={cn(
            "p-2.5 rounded-full transition-colors shrink-0 text-sm font-medium",
            isInternalNote ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400" : "text-muted-foreground hover:bg-muted"
          )}
          title="Toggle Internal Note"
        >
          <FileText className="w-5 h-5" />
        </button>

        <button 
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          className="p-2.5 bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary rounded-full transition-colors shrink-0 shadow-sm"
        >
          <Send className="w-5 h-5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
