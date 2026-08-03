import { IndianRupee, TrendingUp, AlertCircle, ArrowUpRight, Wallet, Building, Percent } from 'lucide-react';
import { useFinance } from '../../../hooks/useFinance';
import { Skeleton } from '../../ui/Skeleton';

export function DashboardTab() {
  const { stats, ledgerEntries, isLoading, formatCurrency } = useFinance();
  const { totalRevenue, totalReceived, pendingPayments, totalCommission, pendingPayouts, pendingCommission } = stats;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Total Revenue</h3>
            <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-green-500 font-medium">Live</span> from Supabase
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Total Received</h3>
            <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-green-500 font-medium">Paid</span> payments only
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Pending Payments</h3>
            <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(pendingPayments)}</p>
            <p className="text-xs text-muted-foreground mt-1">Due from students</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Total Commission</h3>
            <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCommission)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <span className="text-green-500 font-medium">Partner</span> commissions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Pending Liabilities</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">University Payouts</p>
                  <p className="text-sm text-muted-foreground">Pending payments to universities</p>
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(pendingPayouts)}</p>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Partner Commissions</p>
                  <p className="text-sm text-muted-foreground">Pending partner commissions</p>
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(pendingCommission)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4">Recent Ledger Entries</h3>
          <div className="space-y-3">
            {ledgerEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No ledger entries yet.</p>
            ) : (
              ledgerEntries.slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    {entry.credit > 0 ? (
                      <p className="text-sm font-bold text-green-600 dark:text-green-500">+{formatCurrency(entry.credit)}</p>
                    ) : (
                      <p className="text-sm font-bold text-red-600 dark:text-red-500">-{formatCurrency(entry.debit)}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono">{entry.reference_number}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
