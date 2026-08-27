
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';
import { formatCurrency } from '../../../lib/utils';

export function ReconciliationTab() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-500" /> Reconciliation Exceptions
        </h3>
        <button className="px-3 py-1.5 bg-background border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm">
          <RefreshCw className="w-4 h-4" /> Run Reconciliation
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
            <tr>
              <th className="px-6 py-3 font-semibold">Exception ID</th>
              <th className="px-6 py-3 font-semibold">Type</th>
              <th className="px-6 py-3 font-semibold">Source Ref</th>
              <th className="px-6 py-3 font-semibold">Discrepancy</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td colSpan={5} className="p-0">
                <EmptyState 
                  icon={ShieldAlert} 
                  title="No exceptions found" 
                  description="All payment gateway events match internal CRM ledgers perfectly." 
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
