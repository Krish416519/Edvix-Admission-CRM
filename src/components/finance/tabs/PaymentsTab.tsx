import { useState, useMemo } from 'react';
import { Search, Filter, Download, ExternalLink, IndianRupee } from 'lucide-react';
import { useFinance, PaymentRow } from '../../../hooks/useFinance';
import { PaymentStatus } from '../../../types/finance';
import { EmptyState } from '../../ui/EmptyState';
import { Skeleton } from '../../ui/Skeleton';

export function PaymentsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const { payments, isLoading, formatCurrency } = useFinance();

  const filteredRecords = useMemo(() => {
    return payments.filter(record => {
      const studentName = record.admissions?.leads?.full_name || '';
      const university = record.admissions?.universities?.name || '';
      const matchesSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        university.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, statusFilter]);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payments, students..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1.5 flex-1 min-w-[150px]">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full bg-transparent text-sm focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Payment ID & Date</th>
                <th scope="col" className="px-6 py-3 font-semibold">Student Details</th>
                <th scope="col" className="px-6 py-3 font-semibold">Payment Type</th>
                <th scope="col" className="px-6 py-3 font-semibold">Amount Details</th>
                <th scope="col" className="px-6 py-3 font-semibold">Status</th>
                <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground font-mono">{record.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{record.payment_date ? new Date(record.payment_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm">
                        {(record.admissions?.leads?.full_name || 'U').charAt(0)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{record.admissions?.leads?.full_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{record.admissions?.universities?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{record.payment_type}</span>
                      <span className="text-xs text-muted-foreground">{record.payment_mode || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground">{formatCurrency(record.final_amount || 0)}</span>
                      {(record.status === 'Pending' || record.status === 'Partially Paid') ? (
                        <span className="text-xs text-red-500 font-medium">Due: {formatCurrency(record.final_amount || 0)}</span>
                      ) : (
                        <span className="text-xs text-green-500 font-medium">Fully Paid</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      record.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400' :
                      record.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={IndianRupee}
                      title="No payments found"
                      description="We couldn't find any payments matching your current filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
