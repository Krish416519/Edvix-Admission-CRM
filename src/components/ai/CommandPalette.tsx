import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Mic, Send, Command, Loader2, User, Bot, AlertTriangle, MessageSquare, BarChart2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AIService } from '../../lib/ai/AIService';
import { AIMessage } from '../../lib/ai/types';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AIReportRenderer } from './AIReportRenderer';
import { sanitizeHtml } from '../../lib/sanitize';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !user) return;
    
    // Create a temporary conversation ID for the command palette session if not persisting
    const sessionId = 'cmd-palette-' + crypto.randomUUID();

    const userMsg: AIMessage = { id: crypto.randomUUID(), conversation_id: sessionId, role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await AIService.sendMessage(user.id, text, messages, location.pathname);
      
      const aiMsg: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: sessionId,
        role: 'model',
        content: responseText,
        created_at: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errorMsg: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: sessionId,
        role: 'model',
        content: `Error: ${e.message}`,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMessageContent = (content: string) => {
    // Try to extract JSON report if present
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
       try {
         const parsed = JSON.parse(jsonMatch[1]);
         if (parsed.report_id) {
            const textContent = content.replace(jsonMatch[0], '');
            return { text: textContent, report: parsed };
         }
       } catch(e) {}
    }
    
    // Fallback: just return text with basic formatting
    const formattedText = sanitizeHtml(content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n').join('<br />'));
    return { text: formattedText, report: null };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-3xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header / Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Type a command or ask a question... (e.g. 'Show hot leads')"
            className="flex-1 bg-transparent border-0 focus:ring-0 text-foreground text-lg placeholder:text-muted-foreground outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
             <button 
                title="Voice commands coming soon"
                className="p-2 hover:bg-muted text-muted-foreground rounded-lg transition-colors relative group"
             >
                <Mic className="w-5 h-5" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Coming Soon</span>
             </button>
             <div className="h-6 w-px bg-border mx-1"></div>
             <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
               <Command className="w-3 h-3" /> <span>K</span>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div 
           ref={scrollRef}
           className="flex-1 max-h-[60vh] min-h-[300px] overflow-y-auto p-4 bg-card"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70 mt-8 mb-12">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                 <Sparkles className="w-8 h-8 text-primary" />
               </div>
               <h3 className="font-semibold text-xl text-foreground mb-2">AI Command Center</h3>
               <p className="text-sm text-muted-foreground max-w-sm mb-8">
                 Use natural language to search records, generate reports, bulk assign leads, and execute workflows.
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left">
                  <button onClick={() => handleSend("Show today's leads")} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors group">
                    <MessageSquare className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Show today's leads</span>
                  </button>
                  <button onClick={() => handleSend("Generate counselor performance report")} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors group">
                    <BarChart2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Generate counselor report</span>
                  </button>
                  <button onClick={() => handleSend("Assign all New leads from Delhi to Rahul")} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors group">
                    <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Bulk assign leads</span>
                  </button>
                  <button onClick={() => handleSend("Show pending payments")} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors group">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Show pending payments</span>
                  </button>
               </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg) => {
                 const { text, report } = parseMessageContent(msg.content);
                 return (
                   <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                     <div className={cn(
                       "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 border",
                       msg.role === 'user' 
                         ? "bg-muted border-border" 
                         : "bg-primary/10 border-primary/20 text-primary"
                     )}>
                       {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                     </div>
                     <div className={cn("max-w-[85%]", msg.role === 'user' ? "flex justify-end" : "w-full")}>
                       <div className={cn(
                         "px-4 py-3 rounded-2xl text-sm inline-block w-full",
                         msg.role === 'user' 
                           ? "bg-primary text-white rounded-tr-sm w-auto" 
                           : "bg-muted/30 border border-border text-foreground rounded-tl-sm w-full"
                       )}>
                         {text && (
                           <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: text }} />
                         )}
                         {report && (
                           <AIReportRenderer report={report} />
                         )}
                       </div>
                     </div>
                   </div>
                 );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-muted/30 border border-border text-foreground rounded-tl-sm flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Command accepted. Accessing CRM data...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">Enter</kbd> Execute</span>
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">ESC</kbd> Close</span>
           </div>
           <div>Secure • Powered by Gemini AI</div>
        </div>

      </div>
    </div>
  );
}
