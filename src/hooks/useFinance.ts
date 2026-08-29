import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// ─── Types for UI backward compatibility ────────────────────────────────────

export interface PaymentRow {
  id: string;
  admission_id: string | null;
  lead_id: string | null;
  payment_type: string;
  amount: number;
  gst: number;
  discount: number;
  scholarship: number;
  final_amount: number;
  payment_date: string | null;
  payment_mode: string | null;
  transaction_id: string | null;
  receipt_url: string | null;
  remarks: string | null;
  status: string;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  admissions?: {
    id: string;
    enrollment_number: string | null;
    leads?: { first_name: string; last_name?: string | null; email: string } | null;
    universities?: { name: string } | null;
    courses?: { name: string } | null;
  } | null;
}

export interface UniversityPayoutRow {
  id: string;
  admission_id: string | null;
  university_name: string;
  invoice_number: string;
  invoice_date: string;
  invoice_amount: number;
  expected_amount: number;
  received_amount: number;
  pending_amount: number;
  payout_status: string;
  payment_date: string | null;
  invoice_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerCommissionRow {
  id: string;
  admission_id: string | null;
  payment_id: string | null;
  commission_percentage: number;
  commission_amount: number;
  subvention: number;
  university_share: number;
  partner_share: number;
  net_commission: number;
  commission_status: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryRow {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_number: string | null;
  related_admission_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFinance() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [universityPayouts, setUniversityPayouts] = useState<UniversityPayoutRow[]>([]);
  const [partnerCommissions, setPartnerCommissions] = useState<PartnerCommissionRow[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paymentsRes, payoutsRes, commissionsRes, ledgerRes] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            *,
            admissions (
              id, enrollment_number,
              leads (first_name, last_name, email),
              universities (name),
              courses (name)
            ),
            invoices ( invoice_number )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('university_payouts')
          .select(`
            *,
            universities ( name )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('commissions')
          .select('*')
          .eq('recipient_type', 'Partner')
          .order('created_at', { ascending: false }),
        supabase
          .from('ledger_entries')
          .select('*')
          .order('date', { ascending: false }),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (payoutsRes.error) throw payoutsRes.error;
      if (commissionsRes.error) throw commissionsRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      // Map Payments to UI format
      const mappedPayments: PaymentRow[] = (paymentsRes.data || []).map((p: any) => ({
        id: p.id,
        admission_id: p.admission_id,
        lead_id: p.lead_id,
        payment_type: p.fee_category,
        amount: Number(p.amount),
        gst: Number(p.gst),
        discount: Number(p.discount),
        scholarship: Number(p.scholarship),
        final_amount: Number(p.net_amount),
        payment_date: p.payment_date,
        payment_mode: p.payment_method,
        transaction_id: p.transaction_id,
        receipt_url: null, // Can map to payment_receipts table if needed later
        remarks: p.remarks,
        status: p.status,
        invoice_id: p.invoices?.invoice_number || p.payment_number,
        created_at: p.created_at,
        updated_at: p.updated_at,
        admissions: p.admissions
      }));

      // Map Payouts
      const mappedPayouts: UniversityPayoutRow[] = (payoutsRes.data || []).map((p: any) => ({
        id: p.id,
        admission_id: p.admission_id,
        university_name: p.universities?.name || 'Unknown',
        invoice_number: p.invoice_number,
        invoice_date: p.invoice_date,
        invoice_amount: Number(p.invoice_amount),
        expected_amount: Number(p.expected_amount),
        received_amount: Number(p.received_amount),
        pending_amount: Number(p.pending_amount),
        payout_status: p.payout_status,
        payment_date: p.payment_date,
        invoice_pdf_url: p.invoice_path,
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      // Map Commissions
      const mappedCommissions: PartnerCommissionRow[] = (commissionsRes.data || []).map((c: any) => ({
        id: c.id,
        admission_id: c.admission_id,
        payment_id: c.payment_id,
        commission_percentage: Number(c.commission_percentage),
        commission_amount: Number(c.commission_amount),
        subvention: Number(c.subvention),
        university_share: 0,
        partner_share: Number(c.net_commission),
        net_commission: Number(c.net_commission),
        commission_status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      // Map Ledger
      const mappedLedger: LedgerEntryRow[] = (ledgerRes.data || []).map((l: any) => ({
        id: l.id,
        date: l.date,
        description: l.description,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balance: Number(l.balance),
        reference_number: l.entry_number,
        related_admission_id: l.related_admission_id,
        created_at: l.created_at,
        updated_at: l.updated_at
      }));

      setPayments(mappedPayments);
      setUniversityPayouts(mappedPayouts);
      setPartnerCommissions(mappedCommissions);
      setLedgerEntries(mappedLedger);

    } catch (err: any) {
      console.error('Finance fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // Real-time subscriptions
    const paymentsChannel = supabase.channel('finance-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchAll)
      .subscribe();

    const payoutsChannel = supabase.channel('finance-payouts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'university_payouts' }, fetchAll)
      .subscribe();

    const commissionsChannel = supabase.channel('finance-commissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, fetchAll)
      .subscribe();

    const ledgerChannel = supabase.channel('finance-ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(payoutsChannel);
      supabase.removeChannel(commissionsChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, [fetchAll]);

  // ── CRUD: Payments ────────────────────────────────────────────────────────

  const createPayment = async (data: Partial<PaymentRow>) => {
    // Verify: net_amount = amount + gst - discount - scholarship
    const amount = data.amount || 0;
    const gst = data.gst || 0;
    const discount = data.discount || 0;
    const scholarship = data.scholarship || 0;
    const computedFinal = amount + gst - discount - scholarship;

    const payload = {
      admission_id: data.admission_id,
      lead_id: data.lead_id,
      fee_category: data.payment_type || 'General',
      amount: amount,
      discount: discount,
      scholarship: scholarship,
      gst: gst,
      net_amount: computedFinal,
      payment_method: data.payment_mode || 'Bank Transfer',
      transaction_id: data.transaction_id,
      status: data.status || 'Paid',
      payment_date: data.payment_date || new Date().toISOString(),
      remarks: data.remarks
    };

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert(payload)
      .select()
      .single();

    if (error) { toast.error('Failed to create payment: ' + error.message); return null; }

    toast.success('Payment recorded successfully');
    await fetchAll();
    return newPayment;
  };

  const updatePayment = async (id: string, data: Partial<PaymentRow>) => {
    const payload: any = {};
    if (data.status) payload.status = data.status;
    if (data.remarks) payload.remarks = data.remarks;
    if (data.transaction_id) payload.transaction_id = data.transaction_id;

    const { error } = await supabase.from('payments').update(payload).eq('id', id);
    if (error) { toast.error('Failed to update payment'); return false; }
    toast.success('Payment updated');
    await fetchAll();
    return true;
  };

  // ── CRUD: University Payouts ──────────────────────────────────────────────

  const createPayout = async (data: Partial<UniversityPayoutRow>) => {
    const payload = {
      admission_id: data.admission_id,
      university_id: undefined, // Needs logic in real app to map university_name -> ID, ignored in mock UI create
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date,
      expected_amount: data.expected_amount || 0,
      invoice_amount: data.invoice_amount || 0,
      received_amount: data.received_amount || 0,
      pending_amount: (data.invoice_amount || 0) - (data.received_amount || 0),
      payout_status: data.payout_status || 'Pending'
    };

    const { error } = await supabase.from('university_payouts').insert(payload);
    if (error) { toast.error('Failed to create payout: ' + error.message); return false; }
    toast.success('University payout created');
    await fetchAll();
    return true;
  };

  const updatePayout = async (id: string, data: Partial<UniversityPayoutRow>) => {
    const payload: any = {};
    if (data.payout_status) payload.payout_status = data.payout_status;
    if (data.received_amount !== undefined) payload.received_amount = data.received_amount;

    const { error } = await supabase.from('university_payouts').update(payload).eq('id', id);
    if (error) { toast.error('Failed to update payout'); return false; }
    toast.success('Payout updated');
    await fetchAll();
    return true;
  };

  // ── CRUD: Partner Commissions ─────────────────────────────────────────────

  const createCommission = async (data: Partial<PartnerCommissionRow>) => {
    // Verify: net_commission = commission_amount - subvention
    const commissionAmount = data.commission_amount || 0;
    const subvention = data.subvention || 0;
    const net = commissionAmount - subvention;
    
    const payload = {
      admission_id: data.admission_id,
      payment_id: data.payment_id,
      recipient_type: 'Partner',
      commission_percentage: data.commission_percentage || 0,
      commission_amount: commissionAmount,
      subvention: subvention,
      net_commission: net,
      status: data.commission_status || 'Pending'
    };

    const { error } = await supabase.from('commissions').insert(payload);
    if (error) { toast.error('Failed to create commission: ' + error.message); return false; }
    toast.success('Commission created');
    await fetchAll();
    return true;
  };

  const updateCommission = async (id: string, data: Partial<PartnerCommissionRow>) => {
    const payload: any = {};
    if (data.commission_status) payload.status = data.commission_status;
    
    const { error } = await supabase.from('commissions').update(payload).eq('id', id);
    if (error) { toast.error('Failed to update commission'); return false; }
    toast.success('Commission updated');
    await fetchAll();
    return true;
  };

  // ── CRUD: Ledger Entries ──────────────────────────────────────────────────

  const createLedgerEntry = async (data: Partial<LedgerEntryRow>) => {
    const { error } = await supabase.from('ledger_entries').insert({
      date: data.date || new Date().toISOString(),
      description: data.description || 'Manual Entry',
      debit: data.debit || 0,
      credit: data.credit || 0,
      related_admission_id: data.related_admission_id
      // Balance is auto-calculated via triggers or backend in a real system,
      // Here we just insert what we have, the migration trigger handles payment auto-ledger.
    });
    if (error) { console.error('Failed to create ledger entry:', error.message); return false; }
    return true;
  };

  // ── Aggregated Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((acc, p) => acc + (p.final_amount || 0), 0);
    const totalReceived = payments
      .filter(p => p.status === 'Paid')
      .reduce((acc, p) => acc + (p.final_amount || 0), 0);
    const pendingPayments = payments
      .filter(p => p.status === 'Pending' || p.status === 'Partially Paid')
      .reduce((acc, p) => acc + (p.final_amount || 0), 0);
    const totalCommission = partnerCommissions.reduce((acc, c) => acc + (c.commission_amount || 0), 0);
    const pendingPayouts = universityPayouts
      .filter(p => p.payout_status === 'Pending')
      .reduce((acc, p) => acc + (p.pending_amount || 0), 0);
    const pendingCommission = partnerCommissions
      .filter(c => c.commission_status === 'Pending')
      .reduce((acc, c) => acc + (c.net_commission || 0), 0);

    return { totalRevenue, totalReceived, pendingPayments, totalCommission, pendingPayouts, pendingCommission };
  }, [payments, partnerCommissions, universityPayouts]);

  return {
    payments,
    universityPayouts,
    partnerCommissions,
    ledgerEntries,
    isLoading,
    error,
    stats,
    fetchAll,
    createPayment,
    updatePayment,
    createPayout,
    updatePayout,
    createCommission,
    updateCommission,
    createLedgerEntry,
    formatCurrency,
  };
}
