import { supabase } from '../supabase';
import { DateRangeKey, FinancialMetrics, FinancialDrillDownRecord, LeaderboardItem } from '../../types/commandCenter';

/**
 * BusinessIntelligence — Production-Grade Analytics Engine for Executive Dashboard.
 * Strictly queries authoritative Supabase tables/views with timezone-safe IST boundaries.
 */
export class BusinessIntelligence {

  /**
   * Computes date boundaries in Indian Standard Time (UTC+05:30).
   */
  static getISTDateRange(rangeKey: DateRangeKey = 'thisMonth'): { start: string; end?: string; label: string } {
    const now = new Date();
    // IST offset: UTC + 5h 30m
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);

    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${istYear}-${pad(istMonth + 1)}-${pad(istDate)}`;

    switch (rangeKey) {
      case 'today':
        return { start: todayStr, label: 'Today' };
      case 'yesterday': {
        const yDate = new Date(Date.UTC(istYear, istMonth, istDate - 1));
        const yStr = `${yDate.getUTCFullYear()}-${pad(yDate.getUTCMonth() + 1)}-${pad(yDate.getUTCDate())}`;
        return { start: yStr, end: todayStr, label: 'Yesterday' };
      }
      case 'last7days': {
        const d7 = new Date(Date.UTC(istYear, istMonth, istDate - 7));
        return { start: `${d7.getUTCFullYear()}-${pad(d7.getUTCMonth() + 1)}-${pad(d7.getUTCDate())}`, label: 'Last 7 Days' };
      }
      case 'last30days': {
        const d30 = new Date(Date.UTC(istYear, istMonth, istDate - 30));
        return { start: `${d30.getUTCFullYear()}-${pad(d30.getUTCMonth() + 1)}-${pad(d30.getUTCDate())}`, label: 'Last 30 Days' };
      }
      case 'thisMonth':
      default:
        return { start: `${istYear}-${pad(istMonth + 1)}-01`, label: 'This Month' };
      case 'all':
        return { start: '1970-01-01', label: 'All Time' };
    }
  }

  /**
   * Retrieves high-integrity financial intelligence based on selected date range.
   */
  static async getRevenueMetrics(rangeKey: DateRangeKey = 'thisMonth'): Promise<FinancialMetrics> {
    const { start: todayStr } = this.getISTDateRange('today');
    const { start: periodStart, end: periodEnd, label: periodLabel } = this.getISTDateRange(rangeKey);

    try {
      // 1. Revenue Today (canonical Paid status in IST today)
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('net_amount, amount')
        .eq('status', 'Paid')
        .gte('payment_date', todayStr);

      const revenueToday = (todayPayments || []).reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

      // 2. Revenue in selected Period
      let periodQuery = supabase
        .from('payments')
        .select('net_amount, amount')
        .eq('status', 'Paid')
        .gte('payment_date', periodStart);

      if (periodEnd) {
        periodQuery = periodQuery.lt('payment_date', periodEnd);
      }

      const { data: periodPayments } = await periodQuery;
      const revenuePeriod = (periodPayments || []).reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

      // 3. Pending collections (Outstanding receivables)
      const { data: pendingPayments } = await supabase
        .from('payments')
        .select('net_amount, amount, created_at, payment_date')
        .eq('status', 'Pending');

      const pendingCollections = (pendingPayments || []).reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

      // 4. Expected Admission Revenue vs Pipeline Opportunity (Section 10 Separation)
      const { data: activeAdmissions } = await supabase
        .from('admissions')
        .select('fee_structure, expected_revenue')
        .eq('admission_status', 'Active');

      const expectedAdmissionRevenue = (activeAdmissions || []).reduce((s, a) => s + Number(a.expected_revenue || a.fee_structure || 0), 0);

      // Pipeline Opportunity: Estimated value from qualified and hot prospective student leads
      const { data: hotLeads } = await supabase
        .from('leads')
        .select('budget')
        .in('lead_status', ['Hot', 'Qualified', 'Application', 'ApplicationStarted'])
        .is('deleted_at', null)
        .limit(100);

      const pipelineOpportunity = (hotLeads || []).reduce((s, l) => {
        const b = parseFloat(String(l.budget).replace(/[^0-9.]/g, ''));
        return s + (isNaN(b) ? 0 : b);
      }, 0);

      const expectedRevenue = expectedAdmissionRevenue > 0 ? expectedAdmissionRevenue : pipelineOpportunity;

      // 5. Collection Rate: Collected / (Collected + Pending) * 100
      const totalReceivable = revenuePeriod + pendingCollections;
      const collectionRate = totalReceivable > 0 ? Math.round((revenuePeriod / totalReceivable) * 100) : 100;

      // 6. Revenue At Risk: Pending payments older than 7 days, or admissions marked at_risk
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const revenueAtRisk = (pendingPayments || [])
        .filter(p => {
          const date = p.payment_date || p.created_at;
          return date && new Date(date).toISOString() < sevenDaysAgo;
        })
        .reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);

      return {
        revenueToday,
        revenuePeriod,
        expectedAdmissionRevenue,
        pipelineOpportunity,
        expectedRevenue,
        pendingCollections,
        collectionRate,
        revenueAtRisk,
        currency: 'INR',
        periodLabel,
      };
    } catch (err) {
      console.error('Error computing financial metrics:', err);
      return {
        revenueToday: 0,
        revenuePeriod: 0,
        expectedAdmissionRevenue: 0,
        pipelineOpportunity: 0,
        expectedRevenue: 0,
        pendingCollections: 0,
        collectionRate: 0,
        revenueAtRisk: 0,
        currency: 'INR',
        periodLabel,
      };
    }
  }

  /**
   * Retrieves underlying line items for financial drill-down inspection.
   */
  static async getFinancialDrillDown(type: 'today' | 'period' | 'pending' | 'expected' | 'atRisk' | 'pipeline', rangeKey: DateRangeKey = 'thisMonth'): Promise<FinancialDrillDownRecord[]> {
    const { start: todayStr } = this.getISTDateRange('today');
    const { start: periodStart, end: periodEnd } = this.getISTDateRange(rangeKey);
    const records: FinancialDrillDownRecord[] = [];

    try {
      if (type === 'today' || type === 'period' || type === 'pending' || type === 'atRisk') {
        let query = supabase
          .from('payments')
          .select('id, payment_id, net_amount, amount, status, payment_date, created_at, lead_id, admission_id');

        if (type === 'today') {
          query = query.eq('status', 'Paid').gte('payment_date', todayStr);
        } else if (type === 'period') {
          query = query.eq('status', 'Paid').gte('payment_date', periodStart);
          if (periodEnd) query = query.lt('payment_date', periodEnd);
        } else if (type === 'pending' || type === 'atRisk') {
          query = query.eq('status', 'Pending');
        }

        const { data: payments } = await query.order('created_at', { ascending: false }).limit(50);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

        if (payments && payments.length > 0) {
          const leadIds = payments.map(p => p.lead_id).filter(Boolean);
          const { data: leads } = leadIds.length > 0
            ? await supabase.from('leads').select('id, first_name, last_name, assigned_counselor').in('id', leadIds)
            : { data: [] };

          const leadMap = new Map((leads || []).map(l => [l.id, l]));

          for (const p of payments) {
            const isAtRisk = (p.payment_date || p.created_at) && new Date(p.payment_date || p.created_at).toISOString() < sevenDaysAgo;
            if (type === 'atRisk' && !isAtRisk) continue;

            const lead = p.lead_id ? leadMap.get(p.lead_id) : null;
            const studentName = lead ? `${lead.first_name} ${lead.last_name || ''}`.trim() : 'Prospective Student';

            records.push({
              id: p.id,
              recordNumber: p.payment_id || p.id.slice(0, 8),
              studentName,
              counselorName: 'Assigned Counselor',
              amount: Number(p.net_amount || p.amount || 0),
              status: p.status,
              date: p.payment_date || p.created_at || new Date().toISOString(),
              type: type === 'pending' ? 'pending' : 'payment',
              linkRoute: p.lead_id ? `/all-leads/${p.lead_id}` : '/smart-view',
            });
          }
        }
      } else if (type === 'expected') {
        const { data: admissions } = await supabase
          .from('admissions')
          .select('id, lead_id, student_name, fee_structure, expected_revenue, admission_status, current_stage, created_at')
          .eq('admission_status', 'Active')
          .limit(50);

        (admissions || []).forEach(a => {
          records.push({
            id: a.id,
            recordNumber: a.id.slice(0, 8),
            studentName: a.student_name || 'Active Applicant',
            counselorName: a.current_stage || 'Active',
            amount: Number(a.expected_revenue || a.fee_structure || 0),
            status: a.current_stage || 'Active',
            date: a.created_at,
            type: 'admission',
            linkRoute: a.lead_id ? `/all-leads/${a.lead_id}` : `/smart-view`,
          });
        });
      } else if (type === 'pipeline') {
        const { data: hotLeads } = await supabase
          .from('leads')
          .select('id, first_name, last_name, budget, lead_status, created_at')
          .in('lead_status', ['Hot', 'Qualified', 'Application', 'ApplicationStarted'])
          .is('deleted_at', null)
          .limit(50);

        (hotLeads || []).forEach(l => {
          const b = parseFloat(String(l.budget).replace(/[^0-9.]/g, '')) || 0;
          if (b > 0) {
            records.push({
              id: l.id,
              recordNumber: l.id.slice(0, 8),
              studentName: `${l.first_name} ${l.last_name || ''}`.trim(),
              counselorName: l.lead_status,
              amount: b,
              status: l.lead_status,
              date: l.created_at,
              type: 'pending',
              linkRoute: `/all-leads/${l.id}`,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error fetching financial drill-down records:', e);
    }

    return records;
  }

  /**
   * Admission conversion and document throughput metrics.
   */
  static async getAdmissionMetrics() {
    const { start: todayStr } = this.getISTDateRange('today');

    try {
      const { data: todayAdmissions } = await supabase
        .from('admissions')
        .select('id')
        .gte('created_at', todayStr);

      const { count: totalLeadsCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: completedCount } = await supabase
        .from('admissions')
        .select('id', { count: 'exact', head: true })
        .eq('admission_status', 'Completed');

      const { count: pendingDocsCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'Pending');

      const totalLeads = totalLeadsCount || 0;
      const totalCompleted = completedCount || 0;

      // Honest conversion rate: completed admissions / active leads
      const conversionRate = totalLeads > 0 ? Math.round((totalCompleted / totalLeads) * 100) : 0;

      return {
        admissionsToday: todayAdmissions?.length || 0,
        conversionRate,
        pendingDocuments: pendingDocsCount || 0,
        totalCompleted,
      };
    } catch (e) {
      console.error('Error fetching admission metrics:', e);
      return {
        admissionsToday: 0,
        conversionRate: 0,
        pendingDocuments: 0,
        totalCompleted: 0,
      };
    }
  }

  /**
   * Returns top performing universities based on enrollments and applications.
   */
  static async getTopUniversities(limit: number = 5): Promise<LeaderboardItem[]> {
    try {
      // 1. Try admissions first (both Active and Completed)
      const { data: admData } = await supabase
        .from('admissions')
        .select('university_id')
        .in('admission_status', ['Active', 'Completed'])
        .not('university_id', 'is', null)
        .limit(300);

      const counts: Record<string, number> = {};
      (admData || []).forEach(d => {
        if (d.university_id) {
          counts[d.university_id] = (counts[d.university_id] || 0) + 1;
        }
      });

      // 2. If admissions have few or no records, complement with leads
      if (Object.keys(counts).length === 0) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('university_id')
          .not('university_id', 'is', null)
          .is('deleted_at', null)
          .limit(300);

        (leadData || []).forEach(l => {
          if (l.university_id) {
            counts[l.university_id] = (counts[l.university_id] || 0) + 1;
          }
        });
      }

      const universityIds = Object.keys(counts);
      if (universityIds.length === 0) return [];

      const { data: unis } = await supabase
        .from('universities')
        .select('id, name, code')
        .in('id', universityIds);

      const uniMap = new Map((unis || []).map(u => [u.id, u]));

      return universityIds
        .map(id => {
          const u = uniMap.get(id);
          return {
            id,
            name: u?.name || 'Partner University',
            count: counts[id],
            subText: u?.code ? `Code: ${u.code}` : undefined,
            badge: `${counts[id]} Applicants`,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (e) {
      console.error('Error fetching top universities:', e);
      return [];
    }
  }

  /**
   * Returns top counselors based on student assignments and conversions.
   */
  static async getTopCounselors(limit: number = 5): Promise<LeaderboardItem[]> {
    try {
      // Look across admissions and active leads
      const { data: leads } = await supabase
        .from('leads')
        .select('assigned_counselor, lead_status')
        .not('assigned_counselor', 'is', null)
        .is('deleted_at', null)
        .limit(400);

      const counselorCounts: Record<string, { total: number; converted: number }> = {};
      (leads || []).forEach(l => {
        const id = l.assigned_counselor;
        if (!id) return;
        counselorCounts[id] = counselorCounts[id] || { total: 0, converted: 0 };
        counselorCounts[id].total++;
        if (l.lead_status === 'Admitted' || l.lead_status === 'Admission Done') {
          counselorCounts[id].converted++;
        }
      });

      const counselorIds = Object.keys(counselorCounts);
      if (counselorIds.length === 0) return [];

      const { data: users } = await supabase
        .from('users')
        .select('id, name, full_name, email')
        .in('id', counselorIds);

      const userMap = new Map((users || []).map(u => [u.id, u]));

      return counselorIds
        .map(id => {
          const user = userMap.get(id);
          const name = user?.full_name || user?.name || user?.email || 'Counselor';
          const stats = counselorCounts[id];
          return {
            id,
            name,
            count: stats.total,
            subText: `${stats.converted} enrolled`,
            badge: `${stats.total} leads`,
            avatarText: name.charAt(0).toUpperCase(),
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (e) {
      console.error('Error fetching top counselors:', e);
      return [];
    }
  }
}
