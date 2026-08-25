import React from 'react';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';

export function DisputeManagerTab() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-rose-500" /> Financial Disputes
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-semibold">Dispute ID</th>
              <th className="px-6 py-3 font-semibold">Raised By</th>
              <th className="px-6 py-3 font-semibold">Type & Reference</th>
              <th className="px-6 py-3 font-semibold">Amount</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td colSpan={5} className="p-0">
                <EmptyState 
                  icon={AlertCircle} 
                  title="No active disputes" 
                  description="Financial disputes raised by partners will appear here." 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
