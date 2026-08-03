import { useState } from 'react';
import { Search, Filter, Download, ExternalLink, IndianRupee, Building, Percent, FileText } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export function UniversityPayoutsTab() {
  const { universityPayouts, isLoading } = useFinance();

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> University Payouts</h3>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">University & Invoice</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Amount Details</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {universityPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground">{payout.university_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{payout.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(payout.invoice_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-foreground">{formatCurrency(payout.invoice_amount)}</span>
                      {payout.pending_amount > 0 ? (
                        <span className="text-xs text-amber-500 font-medium">Pending: {formatCurrency(payout.pending_amount)}</span>
                      ) : (
                        <span className="text-xs text-green-500 font-medium">Fully Paid</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                      payout.payout_status === 'Processed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400' :
                      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {payout.payout_status}
                    </span>
                  </td>
                </tr>
              ))}
              {universityPayouts.length === 0 && (
                <tr><td colSpan={4} className="p-0"><EmptyState icon={Building} title="No payouts yet" description="University payout records will appear here." /></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function CommissionsTab() {
  const { partnerCommissions, isLoading } = useFinance();

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Percent className="w-5 h-5 text-purple-500" /> Partner Commissions</h3>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">ID & Admission</th>
                <th className="px-6 py-3 font-semibold">Share Details</th>
                <th className="px-6 py-3 font-semibold">Net Commission</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partnerCommissions.map((comm) => (
                <tr key={comm.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold font-mono text-foreground">{comm.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{comm.admission_id?.substring(0, 8) || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{comm.commission_percentage}% Rate</span>
                      <span className="text-xs text-muted-foreground">Subvention: {formatCurrency(comm.subvention)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(comm.net_commission)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                      comm.commission_status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400' :
                      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {comm.commission_status}
                    </span>
                  </td>
                </tr>
              ))}
              {partnerCommissions.length === 0 && (
                <tr><td colSpan={4} className="p-0"><EmptyState icon={Percent} title="No commissions yet" description="Partner commission records will appear here." /></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function LedgerTab() {
  const { ledgerEntries, isLoading } = useFinance();

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-500" /> General Ledger</h3>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">Date & Reference</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold text-right">Debit</th>
                <th className="px-6 py-3 font-semibold text-right">Credit</th>
                <th className="px-6 py-3 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground font-mono">{entry.reference_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">{entry.description}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-500">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-500">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-foreground">{formatCurrency(entry.balance)}</td>
                </tr>
              ))}
              {ledgerEntries.length === 0 && (
                <tr><td colSpan={5} className="p-0"><EmptyState icon={FileText} title="No ledger entries" description="Ledger entries are auto-created when payments are recorded." /></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function InvoicesTab() {
  const { payments, isLoading } = useFinance();

  const generatePDF = (record: any) => {
    toast.info('Generating invoice PDF...');
    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('INVOICE', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Invoice No: ${record.invoice_id || record.id.substring(0, 8).toUpperCase()}`, 20, 40);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
      doc.text(`Student: ${record.admissions?.leads?.full_name || 'Unknown'}`, 20, 70);
      doc.text(`University: ${record.admissions?.universities?.name || 'N/A'}`, 20, 80);
      doc.text(`Course: ${record.admissions?.courses?.name || 'N/A'}`, 20, 90);
      doc.text(`Payment Type: ${record.payment_type}`, 20, 100);
      doc.text(`Amount: ${formatCurrency(record.amount)}`, 20, 110);
      doc.text(`GST: ${formatCurrency(record.gst)}`, 20, 120);
      doc.text(`Discount: ${formatCurrency(record.discount)}`, 20, 130);
      doc.text(`Final Amount: ${formatCurrency(record.final_amount)}`, 20, 140);
      doc.text(`Status: ${record.status}`, 20, 150);
      doc.save(`Invoice_${record.invoice_id || record.id.substring(0, 8)}.pdf`);
      toast.success('Invoice generated successfully.');
    }, 1000);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> Invoices</h3>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">Invoice No</th>
                <th className="px-6 py-3 font-semibold">Student & Details</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-foreground">{record.invoice_id || record.id.substring(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{record.admissions?.leads?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{record.admissions?.universities?.name} - {record.admissions?.courses?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(record.final_amount || 0)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => generatePDF(record)} className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors font-medium text-xs flex items-center gap-1 ml-auto">
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="p-0"><EmptyState icon={FileText} title="No invoices yet" description="Invoices will appear here once payments are recorded." /></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
