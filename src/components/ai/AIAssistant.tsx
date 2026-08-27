import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2, Bot, User, FunctionSquare } from 'lucide-react';
import { useAI } from '../../contexts/AIContext';
import { useAuth } from '../../contexts/AuthContext';
import { AIService } from '../../lib/ai/AIService';
import { AIMessage } from '../../lib/ai/types';
import { useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { sanitizeHtml } from '../../lib/sanitize';

export function AIAssistant() {
  const { isOpen, closeAssistant, initialPrompt } = useAI();
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversation
  useEffect(() => {
    if (isOpen && user && !conversationId) {
      AIService.createConversation(user.id, { pathname: location.pathname })
        .then(conv => setConversationId(conv.id))
        .catch(console.error);
    }
  }, [isOpen, user, conversationId, location.pathname]);

  // Handle initial prompt
  useEffect(() => {
    if (isOpen && initialPrompt && conversationId) {
      handleSend(initialPrompt);
    }
  }, [isOpen, initialPrompt, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async (cid: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', cid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as AIMessage[]);
  };

  useEffect(() => {
    if (conversationId) loadHistory(conversationId);
  }, [conversationId]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !user || !conversationId) return;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Pass the current state of messages (excluding the one we just optimistically added)
      const currentHistory = [...messages]; 
      
      const responseText = await AIService.sendMessage(
        user.id,
        text,
        currentHistory,
        location.pathname,
        conversationId
      );

      const aiMessage: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: 'model',
        content: responseText,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: AIMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: 'model',
        content: 'Sorry, I encountered an error: ' + error.message,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format simple markdown (bold and newlines)
  const formatMessage = (content: string) => {
    if (!content) return '';
    return content.split('\n').map((line, i) => {
      // Replace **text** with bold
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(formattedLine) }} />
          <br />
        </span>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]" onClick={closeAssistant} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-card border-l border-border shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Edvix AI</h2>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected to live CRM
              </p>
            </div>
          </div>
          <button 
            onClick={closeAssistant}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
              <Bot className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg text-foreground mb-2">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                I can analyze leads, find pending payments, create tasks, and summarize information using real CRM data.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 border",
                msg.role === 'user' 
                  ? "bg-muted border-border" 
                  : "bg-primary/10 border-primary/20 text-primary"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl max-w-[80%] text-sm",
                msg.role === 'user' 
                  ? "bg-primary text-white rounded-tr-sm" 
                  : "bg-muted/50 border border-border text-foreground rounded-tl-sm"
              )}>
                {formatMessage(msg.content)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-muted/50 border border-border text-foreground rounded-tl-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground animate-pulse">Thinking & gathering context...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/10">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-end gap-2 bg-card border border-border rounded-xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ask me anything about your leads..."
              className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-0 focus:ring-0 text-sm p-2 outline-none"
              rows={input.split('\n').length > 1 ? Math.min(input.split('\n').length, 4) : 1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary transition-colors shrink-0 mb-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center justify-center gap-1">
              <FunctionSquare className="w-3 h-3" /> MCP Tool Execution Enabled
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
