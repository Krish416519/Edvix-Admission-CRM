import { supabase } from '../supabase';

/**
 * BusinessIntelligence — Aggregate queries for executive dashboards.
 * All data is pulled from live Supabase. Zero mock data.
 */
export class BusinessIntelligence {

  static async getRevenueMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // Revenue today
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('net_amount')
      .eq('status', 'Paid')
      .gte('payment_date', today);

    const revenueToday = (todayPayments || []).reduce((s, p) => s + (p.net_amount || 0), 0);

    // Revenue this month
    const { data: monthPayments } = await supabase
      .from('payments')
      .select('net_amount')
      .eq('status', 'Paid')
      .gte('payment_date', monthStart);

    const revenueMonth = (monthPayments || []).reduce((s, p) => s + (p.net_amount || 0), 0);

    // Pending revenue
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('net_amount')
      .eq('status', 'Pending');

    const revenuePending = (pendingPayments || []).reduce((s, p) => s + (p.net_amount || 0), 0);

    // Expected revenue (from active admissions fee structures)
    const { data: activeAdmissions } = await supabase
      .from('admissions')
      .select('fee_structure')
      .eq('admission_status', 'Active');

    const expectedRevenue = (activeAdmissions || []).reduce((s, a) => s + (a.fee_structure || 0), 0);

    return { revenueToday, revenueMonth, revenuePending, expectedRevenue };
  }

  static async getAdmissionMetrics() {
    const today = new Date().toISOString().split('T')[0];

    const { data: todayAdmissions } = await supabase
      .from('admissions')
      .select('id')
      .gte('created_at', today);

    const { data: totalLeads } = await supabase
      .from('leads')
      .select('id')
      .is('deleted_at', null);

    const { data: completedAdmissions } = await supabase
      .from('admissions')
      .select('id')
      .eq('admission_status', 'Completed');

    const { data: pendingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('verification_status', 'Pending');

    const conversionRate = (totalLeads?.length || 0) > 0
      ? Math.round(((completedAdmissions?.length || 0) / (totalLeads?.length || 1)) * 100)
      : 0;

    return {
      admissionsToday: todayAdmissions?.length || 0,
      conversionRate,
      pendingDocuments: pendingDocs?.length || 0,
      totalCompleted: completedAdmissions?.length || 0,
    };
  }

  static async getTopUniversities() {
    const { data } = await supabase
      .from('admissions')
      .select('university_id, universities(name)')
      .eq('admission_status', 'Completed')
      .limit(200);

    const counts: Record<string, { name: string; count: number }> = {};
    (data || []).forEach((d: any) => {
      const name = d.universities?.name || 'Unknown';
      counts[name] = counts[name] || { name, count: 0 };
      counts[name].count++;
    });

    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }

  static async getTopCounselors() {
    const { data } = await supabase
      .from('admissions')
      .select('assigned_counselor, users!admissions_assigned_counselor_fkey(full_name)')
      .eq('admission_status', 'Completed')
      .limit(200);

    const counts: Record<string, { name: string; count: number }> = {};
    (data || []).forEach((d: any) => {
      const name = d.users?.full_name || 'Unknown';
      counts[name] = counts[name] || { name, count: 0 };
      counts[name].count++;
    });

    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }
}
