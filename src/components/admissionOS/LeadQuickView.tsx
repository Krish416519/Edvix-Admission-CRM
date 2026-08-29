import { X, Phone, MessageCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { PipelineCard } from '../../lib/ai/AdmissionOS';

interface LeadQuickViewProps {
  lead: PipelineCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadQuickView({ lead, isOpen, onClose }: LeadQuickViewProps) {
  const navigate = useNavigate();

  if (!isOpen || !lead) return null;

  const handleWhatsApp = () => {
    const formattedPhone = lead.phone.replace(/\D/g, '');
    const url = `https://wa.me/${formattedPhone.length === 10 ? '91' + formattedPhone : formattedPhone}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{lead.studentName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-muted-foreground">{lead.phone}</span>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-sm text-muted-foreground">{lead.email}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stage</p>
              <p className="font-medium">{lead.pipelineStage}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Intent</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">{lead.admissionProbability}% Probability</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
              <p className={cn(
                "font-medium",
                lead.riskLevel === 'Critical' ? "text-red-600 dark:text-red-400" :
                lead.riskLevel === 'High' ? "text-orange-600 dark:text-orange-400" :
                "text-emerald-600 dark:text-emerald-400"
              )}>
                {lead.riskLevel}
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expected Rev</p>
              <p className="font-medium">₹{(lead.expectedRevenue / 100000).toFixed(1)}L</p>
            </div>
          </div>

          {/* Next Action */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Recommended Action
            </h3>
            <p className="text-sm font-medium">{lead.nextAction}</p>
          </div>
        </div>

         {/* Footer Actions */}
         <div className="p-6 pt-4 border-t border-border bg-muted/30">
           <div className="mb-3">
             <button
               onClick={handleWhatsApp}
               className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#25D366] text-white rounded-xl hover:bg-[#25D366]/90 transition-colors font-medium text-sm shadow-sm"
             >
               <MessageCircle className="w-4 h-4" />
               WhatsApp
             </button>
           </div>
           <div className="grid grid-cols-2 gap-3 mb-3">
             <button
               onClick={() => {
                 onClose();
                 navigate(`/all-leads/${lead.leadId}`);
               }}
               className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-background border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium text-sm"
             >
               Open Full Profile
               <ArrowRight className="w-4 h-4" />
             </button>
             <button
               onClick={() => {
                 onClose();
                 window.dispatchEvent(new CustomEvent('open-disposition', { detail: { leadId: lead.leadId } }));
               }}
               className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm"
             >
               <Phone className="w-4 h-4" />
               Add Activity
             </button>
           </div>
         </div>
       </div>
     </div>
  );
}
