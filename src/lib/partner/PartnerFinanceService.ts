import { supabase } from '../supabase';

export const partnerFinanceService = {
  // Read-only ledger view
  async getPayoutLedger() {
    // RLS restricts this to only the partner's relevant ledger entries
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        admissions:related_admission_id (
          id,
          university_id,
          course_id,
          leads (
            full_name
          )
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching partner ledger:', error);
      throw error;
    }
    return data;
  },

  // Read-only commissions view
  async getCommissions() {
    const { data, error } = await supabase
      .from('commissions')
      .select(`
        *,
        admissions (
          id,
          leads (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partner commissions:', error);
      throw error;
    }
    return data;
  },

  // Aggregated KPIs
  async getPayoutKPIs() {
    const { data, error } = await supabase
      .from('commissions')
      .select('status, net_commission');

    if (error) throw error;

    let totalEarned = 0;
    let pending = 0;
    let paid = 0;

    data?.forEach(c => {
      totalEarned += Number(c.net_commission);
      if (c.status === 'Pending' || c.status === 'Approved') {
        pending += Number(c.net_commission);
      } else if (c.status === 'Paid') {
        paid += Number(c.net_commission);
      }
    });

    return { totalEarned, pending, paid };
  }
};
