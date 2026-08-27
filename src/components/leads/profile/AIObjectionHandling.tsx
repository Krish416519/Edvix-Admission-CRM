
import { aiService } from '../../../lib/aiService';
import { ShieldAlert, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function AIObjectionHandling() {
  const [copiedId, setCopiedId] = React.useState<number | null>(null);
  const replies = aiService.getObjectionHandlingReplies();

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    toast.success('Reply copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold text-foreground text-sm">Objection Handling</h3>
      </div>
      
      <div className="p-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
        {replies.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/50 bg-muted/30 relative group">
            <h4 className="text-xs font-bold text-muted-foreground">{item.objection}</h4>
            <p className="text-sm text-foreground pr-6 leading-snug">{item.reply}</p>
            <button 
              onClick={() => handleCopy(item.reply, idx)}
              className="absolute top-3 right-3 p-1.5 bg-background border border-border rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copiedId === idx ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
