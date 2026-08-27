import { useState, useMemo } from 'react';
import { IndianRupee, Download, Search, Wallet, FileText } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

export function UniversityFinance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { universityPayouts, isLoading, formatCurrency } = useFinance();

  const filteredRecords = useMemo(() => {
    return universityPayouts.filter(payout => {
      const matchesSearch =
        payout.university_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payout.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || payout.payout_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [universityPayouts, searchTerm, statusFilter]);

  const totalSettlement = universityPayouts.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
  const processedSettlement = universityPayouts.filter(p => p.payout_status === 'Processed').reduce((sum, p) => sum + (p.received_amount || 0), 0);
  const pendingSettlement = universityPayouts.filter(p => p.payout_status === 'Pending').reduce((sum, p) => sum + (p.pending_amount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settlements & Finance</h1>
          <p className="text-muted-foreground mt-1">Track financial settlements, university payouts, and invoices with Edvix.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Download Statement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Settlements</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(totalSettlement)}</h3>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Processed</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(processedSettlement)}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(pendingSettlement)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)]">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by university or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 bg-background border border-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Processed">Processed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">University & Invoice</th>
                  <th className="px-6 py-3 font-medium">Invoice Date</th>
                  <th className="px-6 py-3 font-medium text-right">Invoice Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Pending</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((payout) => (
                  <tr key={payout.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{payout.university_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{payout.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(payout.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {formatCurrency(payout.invoice_amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {payout.pending_amount > 0 ? (
                        <span className="text-amber-500">{formatCurrency(payout.pending_amount)}</span>
                      ) : (
                        <span className="text-green-500">Nil</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        payout.payout_status === 'Processed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {payout.payout_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={IndianRupee}
                title="No financial records found"
                description="University settlement records will appear here."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
