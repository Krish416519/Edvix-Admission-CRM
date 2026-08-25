import React from 'react';
import { FileDown, Plus, CheckCircle, Clock, Building } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '../../ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';

export function PayoutManagerTab() {
  const handleGenerateBatch = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Generating payout batch...',
        success: 'Batch BAT-2026-892104 generated successfully!',
        error: 'Failed to generate batch',
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileDown className="w-5 h-5 text-emerald-500" /> Payout Batches
        </h3>
        <button 
          onClick={handleGenerateBatch}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Generate Batch
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-semibold">Batch ID</th>
              <th className="px-6 py-3 font-semibold">Period</th>
              <th className="px-6 py-3 font-semibold">Recipients</th>
              <th className="px-6 py-3 font-semibold">Total Amount</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4 font-mono font-semibold text-foreground">BAT-2026-892103</td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">August 2026</span>
                  <span className="text-xs text-muted-foreground">01 Aug - 31 Aug</span>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" /> 12 Partners
              </td>
              <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(450000)}</td>
              <td className="px-6 py-4">
                <span className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  Pending Approval
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
