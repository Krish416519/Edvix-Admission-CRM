import React, { useState } from 'react';
import { Send, MessageSquare, Mail, Smartphone, Wand2, Paperclip, Loader2, Image as ImageIcon, FileText } from 'lucide-react';
import { ChannelType } from '../../types/communication';
import { omnichannelService } from '../../lib/omnichannel/OmnichannelService';
import { aiAssistantService } from '../../lib/ai/AIAssistantService';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface UnifiedComposerProps {
  conversationId: string; // Could be leadId for Email/SMS
  defaultChannel?: ChannelType;
  onSent?: () => void;
  context?: any;
}

export function UnifiedComposer({ conversationId, defaultChannel = 'whatsapp', onSent, context }: UnifiedComposerProps) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChannelType>(defaultChannel);
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || !user) return;
    setIsSending(true);
    try {
      await omnichannelService.sendMessage(channel, conversationId, content, user.id, subject);
      setContent('');
      setSubject('');
      toast.success('Message sent');
      if (onSent) onSent();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleAIAction = async (action: 'improve' | 'professional' | 'concise' | 'generate') => {
    setIsGenerating(true);
    try {
      if (action === 'generate') {
         const generated = await aiAssistantService.generateReply(context || {}, []);
         setContent(generated);
      } else {
         if (!content.trim()) {
            toast.error('Please enter some text to improve');
            return;
         }
         const improved = await aiAssistantService.processMessage(content, action);
         setContent(improved);
      }
    } catch (err) {
       toast.error('AI Assistant failed to generate text');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Channel Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/20">
        <button 
          onClick={() => setChannel('whatsapp')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            channel === 'whatsapp' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="w-4 h-4" /> WhatsApp
        </button>
        <button 
          onClick={() => setChannel('email')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            channel === 'email' ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
        <button 
          onClick={() => setChannel('sms')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            channel === 'sms' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Smartphone className="w-4 h-4" /> SMS
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-3">
        {channel === 'email' && (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject..."
            className="w-full px-3 py-2 text-sm border-b border-border bg-transparent outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        )}
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Type your ${channel} message...`}
          className="w-full flex-1 min-h-[100px] p-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none"
        />
      </div>

      {/* AI Tools & Actions */}
      <div className="p-2 border-t border-border bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Attach Document">
            <FileText className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Attach Image">
            <ImageIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          
          <button 
            onClick={() => handleAIAction('generate')}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-md transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> Suggest Reply
          </button>
          <button 
            onClick={() => handleAIAction('improve')}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
          >
            Improve
          </button>
          <button 
            onClick={() => handleAIAction('professional')}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"
          >
            Make Professional
          </button>
        </div>

        <button 
          onClick={handleSend}
          disabled={isSending || isGenerating || !content.trim()}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          {isSending || isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
    </div>
  );
}
