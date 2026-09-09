import React, { useEffect } from 'react';
import { X, ExternalLink, IndianRupee, Clock, AlertCircle } from 'lucide-react';
import { FinancialDrillDownRecord } from '../../types/commandCenter';
import { useNavigate } from 'react-router-dom';

interface FinancialDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  totalAmount: number;
  records: FinancialDrillDownRecord[];
  loading?: boolean;
}

export function FinancialDrillDownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  totalAmount,
  records,
  loading = false,
}: FinancialDrillDownModalProps) {
  const navigate = useNavigate();

  // Accessibility: Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  // Exact sum of loaded records
  const recordsSum = records.reduce((s, r) => s + (r.amount || 0), 0);
  const displayTotal = records.length > 0 ? recordsSum : totalAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-modal-title"
    >
      <div 
        className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h2 id="drilldown-modal-title" className="text-lg font-bold text-foreground">{title}</h2>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block font-medium">Reconciled Total</span>
              <span className="text-lg font-bold text-foreground">{fmt(displayTotal)}</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Retrieving contributing financial records from Supabase...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No contributing records found</p>
              <p className="text-xs mt-1">There are currently 0 transactions logged matching this parameter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Contributing Records ({records.length})
              </div>
              {records.map(record => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-border bg-card/60 hover:bg-muted/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{record.studentName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {record.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {record.recordNumber && (
                        <span>ID: #{record.recordNumber}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <span className="text-base font-bold text-foreground">
                      {fmt(record.amount)}
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        navigate(record.linkRoute);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
          <span>Authoritative Supabase Ledger Records</span>
          <button
            onClick={onClose}
            className="font-medium text-foreground hover:underline"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
