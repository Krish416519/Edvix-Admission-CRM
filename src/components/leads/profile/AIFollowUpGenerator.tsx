import { useState } from 'react';
import { Lead } from '../../../types/schema';
import { aiService } from '../../../lib/aiService';
import { Sparkles, MessageSquare, Mail, Phone, MessageCircle, Copy, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export function AIFollowUpGenerator({ lead }: { lead: Lead }) {
  const [activeTab, setActiveTab] = useState<'WhatsApp' | 'Email' | 'SMS' | 'Call Script'>('WhatsApp');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedText('');
    setCopied(false);
    
    try {
      const text = await aiService.generateFollowUpMessage(lead, activeTab);
      // Simulate typing effect
      let currentText = '';
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        currentText += words[i] + ' ';
        setGeneratedText(currentText);
        await new Promise(r => setTimeout(r, 20)); // typing delay
      }
    } catch (error) {
      toast.error('Failed to generate message');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'WhatsApp', icon: MessageCircle },
    { id: 'Email', icon: Mail },
    { id: 'SMS', icon: MessageSquare },
    { id: 'Call Script', icon: Phone },
  ] as const;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">AI Follow-up Generator</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setGeneratedText(''); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.id}
            </button>
          ))}
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Generating...
            </div>
          ) : (
             <>
               <Sparkles className="w-4 h-4" /> Generate {activeTab}
             </>
          )}
        </button>

        {generatedText && (
          <div className="relative group">
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap min-h-[100px]">
              {generatedText}
              {isGenerating && <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />}
            </div>
            {!isGenerating && (
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-background border border-border rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
