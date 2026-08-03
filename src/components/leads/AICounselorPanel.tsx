import { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, Phone, Mail, ShieldAlert, ArrowRight, CheckCircle2, RefreshCw, Copy } from 'lucide-react';
import { Lead } from '../../types/lead';
import { Activity } from '../../types/activity';
import { cn } from '../../lib/utils';

interface AICounselorPanelProps {
  lead: Lead;
  activities: Activity[];
}

type SuggestionType = 'follow-up' | 'call-script' | 'whatsapp' | 'email' | 'objection' | 'next-action';

export function AICounselorPanel({ lead, activities }: AICounselorPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<SuggestionType>('next-action');
  const [copied, setCopied] = useState(false);

  // Simulate AI generation delay
  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [lead.id, activeTab]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSuggestions = () => {
    const context = {
      course: lead.course,
      university: lead.university,
      name: lead.name.split(' ')[0],
    };

    switch (activeTab) {
      case 'next-action':
        return {
          title: 'Next Best Action',
          content: lead.score > 80 
            ? `Call ${context.name} immediately to close the admission. They have a high lead score and are ready to convert.` 
            : `Send a WhatsApp message with the brochure for ${context.course} at ${context.university} to build more interest.`,
          icon: <ArrowRight className="w-4 h-4 text-blue-500" />
        };
      case 'follow-up':
        return {
          title: 'Best Follow-up Message',
          content: `Hi ${context.name}, hope you are doing well. Are you still interested in pursuing the ${context.course} program at ${context.university}? Let me know a good time to connect so we can discuss your admission.`,
          icon: <MessageSquare className="w-4 h-4 text-purple-500" />
        };
      case 'call-script':
        return {
          title: 'Call Script',
          content: `Hi ${context.name}, this is [Your Name] from Edvix.in. \n\nI saw you were looking into the ${context.course} at ${context.university}. \n\nI just wanted to check if you had any questions regarding the curriculum or the fee structure? We have some great EMI options available right now.`,
          icon: <Phone className="w-4 h-4 text-green-500" />
        };
      case 'whatsapp':
        return {
          title: 'WhatsApp Reply',
          content: `Hi ${context.name} 👋,\n\nHere are the details for the ${context.course} at ${context.university}.\n\n✅ Duration: 2 Years\n✅ Fee: Reach out for best offers\n✅ Easy EMI available\n\nLet me know if you want to hop on a quick call! 📞`,
          icon: <MessageSquare className="w-4 h-4 text-emerald-500" />
        };
      case 'email':
        return {
          title: 'Email Draft',
          content: `Subject: Your Admission to ${context.university} - ${context.course}\n\nDear ${context.name},\n\nThank you for exploring the ${context.course} program at ${context.university} through Edvix.in.\n\nTo proceed with your application, we would need you to upload your academic documents on our portal. Once uploaded, we can process your admission within 48 hours.\n\nPlease feel free to reply to this email if you need any assistance.\n\nBest Regards,\nEdvix Admissions Team`,
          icon: <Mail className="w-4 h-4 text-amber-500" />
        };
      case 'objection':
        return {
          title: 'Objection Handling',
          content: `**If they say "It's too expensive":**\n"I understand it's a significant investment, ${context.name}. However, we offer no-cost EMI options starting at just ₹5,000/month. Additionally, a ${context.course} degree from ${context.university} typically increases salary prospects by 30-40%."`,
          icon: <ShieldAlert className="w-4 h-4 text-rose-500" />
        };
    }
  };

  const currentSuggestion = getSuggestions();

  return (
    <div className="bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card border border-indigo-100 dark:border-indigo-500/20 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between bg-white/50 dark:bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">AI Counselor</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Powered by Gemini</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsGenerating(true);
            setTimeout(() => setIsGenerating(false), 1000);
          }}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors"
          title="Regenerate suggestions"
        >
          <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
        </button>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('next-action')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'next-action' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Next Action
          </button>
          <button
            onClick={() => setActiveTab('call-script')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'call-script' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <Phone className="w-3.5 h-3.5" />
            Call Script
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'whatsapp' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'email' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Draft
          </button>
          <button
            onClick={() => setActiveTab('objection')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'objection' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Objections
          </button>
          <button
            onClick={() => setActiveTab('follow-up')}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2",
              activeTab === 'follow-up' 
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-500/30" 
                : "bg-white dark:bg-muted/30 text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-border"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Follow-up
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-card border border-indigo-50 dark:border-indigo-500/10 rounded-xl p-4 shadow-sm mt-2 relative min-h-[250px]">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl z-10 animate-in fade-in">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mb-3"></div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Analyzing context...</p>
              <p className="text-xs text-muted-foreground mt-1">Reading timeline & notes</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              {currentSuggestion.icon}
              {currentSuggestion.title}
            </h4>
            <button 
              onClick={() => handleCopy(currentSuggestion.content)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-medium">
            {currentSuggestion.content.split('**').map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
            )}
          </div>
        </div>
        
        {/* Context indicators */}
        <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium px-2 py-1 rounded bg-muted/50 border border-border text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Context: {activities.length} activities
          </span>
          <span className="text-[10px] font-medium px-2 py-1 rounded bg-muted/50 border border-border text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Context: Lead Score {lead.score}
          </span>
        </div>
      </div>
    </div>
  );
}
