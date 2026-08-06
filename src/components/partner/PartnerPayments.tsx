import React from 'react';
import { CreditCard, Download, Search, Filter, AlertCircle } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';

export function PartnerPayments() {
  const { ledgerEntries, isLoading } = useFinance();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">View payment history and invoices.</p>
        </div>
        <button className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export History
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
             <CreditCard className="w-8 h-8 text-muted-foreground" />
           </div>
           <h3 className="text-lg font-medium text-foreground mb-1">No Payments Yet</h3>
           <p className="text-muted-foreground max-w-sm">
             Your payout history will appear here once your commissions are processed.
           </p>
        </div>
      </div>
    </div>
  );
}
