import { useState } from 'react';
import { Settings, Plus, CheckCircle, Clock } from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';
import { CommissionRuleModal } from './CommissionRuleModal';

export function CommissionRulesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" /> Commission Rules
        </h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 border border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-lg text-foreground">Standard Partner Tier</h4>
                <p className="text-sm text-muted-foreground mt-0.5">Applies to all undergraduate programs</p>
              </div>
              <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/40">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Percentage</div>
                <div className="text-2xl font-black text-indigo-500">10%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Effective</div>
                <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Jan 1, 2026
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-5 border border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-lg text-foreground">Premium Masters Bounty</h4>
                <p className="text-sm text-muted-foreground mt-0.5">Fixed bounty for MBA programs</p>
              </div>
              <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/40">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Fixed Amount</div>
                <div className="text-2xl font-black text-indigo-500">{formatCurrency(50000)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Target</div>
                <div className="text-sm font-medium text-foreground">Gold Partners</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CommissionRuleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
