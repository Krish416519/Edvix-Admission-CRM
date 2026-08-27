import { useState } from 'react';
import { Sparkles, Send, FileText, Bot, AlertCircle } from 'lucide-react';
import { useAdmissions } from '../../hooks/useAdmissions';

export function UniversityAi() {
  const { admissions } = useAdmissions();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Welcome to the University AI Assistant! I can help you summarize applicant profiles, flag missing documents, or analyze admission trends. How can I assist you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = "I'm sorry, I couldn't process that request at the moment.";
      const lowerPrompt = userMessage.toLowerCase();
      
      const pendingDocs = admissions.filter(a => a.stage === 'Document Verification').length;
      const enrolled = admissions.filter(a => a.stage === 'Admission Completed').length;

      if (lowerPrompt.includes('missing') || lowerPrompt.includes('document')) {
        aiResponse = `You currently have **${pendingDocs}** applications pending document verification. Would you like me to draft an automated reminder email to these students?`;
      } else if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
        aiResponse = `Out of ${admissions.length} total applications, you have **${enrolled}** completed admissions and **${pendingDocs}** pending verification. The overall approval rate looks healthy.`;
      } else if (lowerPrompt.includes('flag') || lowerPrompt.includes('incomplete')) {
        aiResponse = `I found 3 applications that have been in the "Application Submitted" stage for over 14 days without movement. I recommend reviewing these to see if they require corrections.`;
      } else {
        aiResponse = `I can help you manage your ${admissions.length} applications. Try asking me to "summarize my applications" or "flag incomplete profiles".`;
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
            <Bot className="w-6 h-6 text-blue-500" />
            University AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered insights for admissions processing.</p>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
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
                placeholder="Ask me to flag incomplete applications or summarize profiles..."
                className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground min-h-[60px] max-h-[120px]"
                rows={2}
              />
              <button 
                onClick={handleSend}
                disabled={!prompt.trim() || isTyping}
                className="absolute right-3 bottom-3 p-1.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1 py-1">Suggestions:</span>
            <button onClick={() => setPrompt('Summarize applications')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors border border-border">
              Summarize Stats
            </button>
            <button onClick={() => setPrompt('Flag missing documents')} className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors border border-border flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Flag Missing Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
