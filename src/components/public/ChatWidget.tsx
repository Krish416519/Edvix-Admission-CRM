import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, Phone, Mail, User as UserIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { LLMClient } from '../../lib/ai/LLMClient';
import { sanitizeHtml } from '../../lib/sanitize';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hi there! 👋 I am the AI Admission Assistant. Are you interested in applying for a university program? I can help you find the best courses and guide you through the process!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLeadCaptured, setIsLeadCaptured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const extractLeadInfo = async (chatHistory: Message[]) => {
    try {
      const historyText = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const responseText = await LLMClient.generateJson(
        historyText, 
        "You are a data extractor. Analyze the chat history and extract the user's name, email, and phone number. Return ONLY a raw JSON object with keys: name (string or null), email (string or null), phone (string or null). If a field is missing, set it to null.",
        0.1
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data;
      }
    } catch (e) {
      console.error("Failed to extract lead info", e);
    }
    return null;
  };

  const submitLead = async (info: any) => {
    if (isLeadCaptured) return;
    if (!info.name || (!info.email && !info.phone)) return;

    try {
       const { error } = await supabase.rpc('public_submit_lead', {
         p_name: info.name,
         p_email: info.email || null,
         p_phone: info.phone || null
       });
       
       if (!error) {
         setIsLeadCaptured(true);
       }
    } catch (e) {
      console.error("Failed to submit lead", e);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatMessages = newMessages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content
      }));

      const systemInstruction = `You are a helpful and persuasive University Admission Assistant for Edvix CRM.
Your goal is to answer the student's queries and eventually ask for their Name, Email, and Phone Number so an admission counselor can contact them.
Once they provide their contact details, thank them and assure them a counselor will reach out shortly. Be friendly, concise, and professional.`;

      const response = await LLMClient.chat(chatMessages, systemInstruction, 0.5);

      const responseText = response.content || '';
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', content: responseText }]);

      // Check if we can extract lead info asynchronously
      if (!isLeadCaptured) {
         extractLeadInfo([...newMessages, { id: 'temp', role: 'user', content: text }]).then(info => {
           if (info && info.name && (info.email || info.phone)) {
             submitLead(info);
           }
         });
      }

    } catch (e: any) {
      console.error("ChatWidget AI Error: ", e);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', content: "I'm having trouble connecting to my brain right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Admission Assistant</h1>
            <p className="text-primary-foreground/80 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/50 bg-black/20 px-3 py-1 rounded-full text-xs font-medium">
          <Sparkles className="w-3 h-3" /> Powered by AI
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
              msg.role === 'user' ? "bg-muted text-muted-foreground hidden sm:flex" : "bg-primary text-white"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={cn(
              "px-4 py-3 rounded-2xl text-sm shadow-sm",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-sm" 
                : "bg-white dark:bg-card border border-border text-foreground rounded-tl-sm"
            )}>
               <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content.replace(/\n/g, '<br/>')) }} />
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white dark:bg-card border border-border rounded-tl-sm flex items-center gap-2 shadow-sm">
               <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-card border-t border-border p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
        <div className="max-w-4xl mx-auto flex items-end gap-2 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Type your message..."
            className="flex-1 max-h-32 min-h-[44px] bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-muted-foreground"
            rows={1}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-5 h-5 -ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
