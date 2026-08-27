import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CommissionRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommissionRuleModal({ isOpen, onClose }: CommissionRuleModalProps) {
  const [targetTier, setTargetTier] = useState('Standard');
  const [percentage, setPercentage] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Commission rule created successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Create New Rule</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Target Tier</label>
            <select 
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="Standard">Standard Partner</option>
              <option value="Silver">Silver Partner</option>
              <option value="Gold">Gold Partner</option>
              <option value="Platinum">Platinum Partner</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Commission Percentage (%)</label>
            <input 
              type="number" 
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Fixed Amount (Optional)</label>
            <input 
              type="number" 
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
