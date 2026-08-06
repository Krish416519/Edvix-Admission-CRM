import React, { useState } from 'react';
import { Sparkles, MessageSquare, Send, FileText, Calendar, Mail } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { Skeleton } from '../ui/Skeleton';

export function PartnerAi() {
  const { leads, isLoading } = useLeads();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hello! I am your Edvix AI Assistant. I can help you summarize leads, draft follow-up emails, or answer FAQs. How can I assist you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setIsTyping(true);

    // Simulate AI response based on the leads data
    setTimeout(() => {
      let aiResponse = "I'm sorry, I couldn't process that request at the moment.";
      
      const lowerPrompt = userMessage.toLowerCase();
      if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
        const activeCount = leads.filter(l => l.status !== 'Lost').length;
        aiResponse = `You currently have ${leads.length} total leads in the system, with ${activeCount} active. The most recent lead is ${leads[0]?.name || 'none'}. Would you like me to generate a follow-up email for them?`;
      } else if (lowerPrompt.includes('email') || lowerPrompt.includes('follow up')) {
        aiResponse = `Here is a drafted email for your latest lead:\n\nSubject: Next Steps for Your Application\n\nHi ${leads[0]?.name?.split(' ')[0] || 'there'},\n\nI hope you are doing well. I noticed we are missing some documents for your application. Please log in to your portal to complete the pending items.\n\nBest regards,\nYour Consultant`;
      } else if (lowerPrompt.includes('commission') || lowerPrompt.includes('payout')) {
        aiResponse = `To check your commission status, please navigate to the 'Commissions' tab. Commissions are typically processed on the 1st of every month.`;
      } else {
        aiResponse = `I can help you manage your ${leads.length} leads. Try asking me to "summarize my leads" or "generate a follow-up email for my newest lead".`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">Your personal co-pilot for managing leads and drafting communications.</p>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-muted text-foreground rounded-bl-none'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me to summarize leads or draft an email..."
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-h-[60px] max-h-[120px]"
                rows={2}
              />
              <button 
                onClick={handleSend}
                disabled={!prompt.trim() || isTyping}
                className="absolute right-3 bottom-3 p-1.5 text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1 py-1">Suggestions:</span>
            <button onClick={() => setPrompt('Summarize my leads')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors border border-border">
              Summarize Leads
            </button>
            <button onClick={() => setPrompt('Draft a follow up email')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors border border-border flex items-center gap-1">
              <Mail className="w-3 h-3" /> Draft Email
            </button>
            <button onClick={() => setPrompt('When do I get my commission?')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors border border-border">
              Commission FAQs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
