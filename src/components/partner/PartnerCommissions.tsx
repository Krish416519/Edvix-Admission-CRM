import { useState, useMemo } from 'react';
import { IndianRupee, Download, Search } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { format } from 'date-fns';

export function PartnerCommissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { partnerCommissions, isLoading, formatCurrency } = useFinance();

  const filteredCommissions = useMemo(() => {
    return partnerCommissions.filter(comm => {
      const matchesSearch = comm.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || comm.commission_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [partnerCommissions, searchTerm, statusFilter]);

  const totalEarnings = partnerCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
  const paidEarnings = partnerCommissions.filter(c => c.commission_status === 'Paid').reduce((sum, c) => sum + (c.net_commission || 0), 0);
  const pendingEarnings = partnerCommissions.filter(c => c.commission_status === 'Pending').reduce((sum, c) => sum + (c.net_commission || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Commissions & Payouts</h1>
          <p className="text-muted-foreground mt-1">Track your earnings and payout history.</p>
        </div>
        <button className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg shadow-sm hover:bg-muted transition-colors flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Download Statement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(totalEarnings)}</h3>
            </div>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Commissions</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(paidEarnings)}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(pendingEarnings)}</h3>
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
              placeholder="Search by commission ID..."
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
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredCommissions.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Commission ID</th>
                  <th className="px-6 py-3 font-medium">Rate & Subvention</th>
                  <th className="px-6 py-3 font-medium text-right">Net Commission</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground font-mono">{comm.id.substring(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{comm.commission_percentage}% Rate</div>
                      <div className="text-xs text-muted-foreground">Subvention: {formatCurrency(comm.subvention)}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {formatCurrency(comm.net_commission)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        comm.commission_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {comm.commission_status}
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
                title="No commissions found"
                description="Commission records will appear here once payments are recorded."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
