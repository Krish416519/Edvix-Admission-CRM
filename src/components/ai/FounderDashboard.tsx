import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Sparkles, TrendingUp, AlertOctagon, LineChart, 
  Target, Users, ShieldAlert, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line
} from 'recharts';
import { format, subDays } from 'date-fns';

export function FounderDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [atRisk, setAtRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
      try {
        const endDate = new Date();
        const startDate = subDays(endDate, 30);
        const prevEndDate = subDays(startDate, 1);
        const prevStartDate = subDays(prevEndDate, 30);
        
        const [summaryRes, atRiskRes] = await Promise.all([
          supabase.rpc('get_bi_executive_summary', {
            p_start_date: format(startDate, 'yyyy-MM-dd'),
            p_end_date: format(endDate, 'yyyy-MM-dd'),
            p_prev_start_date: format(prevStartDate, 'yyyy-MM-dd'),
            p_prev_end_date: format(prevEndDate, 'yyyy-MM-dd')
          }),
          supabase.rpc('get_bi_at_risk_revenue')
        ]);
        
        if (summaryRes.data) setData(summaryRes.data);
        if (atRiskRes.data) setAtRisk(atRiskRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  // Mock data for charts since we need timeseries aggregation
  const revenueData = [
    { name: 'Jan', revenue: 400000 },
    { name: 'Feb', revenue: 300000 },
    { name: 'Mar', revenue: 550000 },
    { name: 'Apr', revenue: 450000 },
    { name: 'May', revenue: 700000 },
    { name: 'Jun', revenue: 850000 },
  ];

  const conversionData = [
    { name: 'Week 1', rate: 12 },
    { name: 'Week 2', rate: 15 },
    { name: 'Week 3', rate: 14 },
    { name: 'Week 4', rate: 18 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Founder Briefing</h1>
            <p className="text-muted-foreground">Executive AI analysis of business health and revenue forecasts.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-lg font-medium text-sm">
          <Sparkles className="w-4 h-4" /> AI Snapshot Current as of Today
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Paid Revenue
          </h3>
          <p className="text-3xl font-bold">₹{data?.current?.revenue?.toLocaleString() || 0}</p>
          <p className={`text-xs mt-2 font-medium ${data?.growth?.revenue_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {data?.growth?.revenue_pct >= 0 ? '+' : ''}{data?.growth?.revenue_pct || 0}% this month
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Conversion Rate
          </h3>
          <p className="text-3xl font-bold">{data?.current?.conversion_rate || 0}%</p>
          <p className="text-xs text-primary mt-2 font-medium">Lead to Admission</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Total Admissions
          </h3>
          <p className="text-3xl font-bold">{data?.current?.total_admissions || 0}</p>
          <p className="text-xs text-muted-foreground mt-2">from {data?.current?.total_leads || 0} leads</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> Critical Risk Alerts
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{atRisk?.stalled_payment_count || 0}</p>
          <p className="text-xs text-red-500/80 mt-2">Admissions pending payment &gt; 14 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Revenue Trajectory</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" />
                  <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                  <RechartsTooltip 
                    cursor={{fill: 'var(--primary)', opacity: 0.1}}
                    contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                  />
                  <Bar dataKey="revenue" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold mb-6">Conversion Rate Trends (%)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="name" stroke="currentColor" className="opacity-50 text-xs" />
                  <YAxis stroke="currentColor" className="opacity-50 text-xs" />
                  <RechartsTooltip 
                    contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                  />
                  <Line type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={3} dot={{r: 6, fill: 'var(--primary)'}} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" /> Executive AI Advice
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-amber-500">
                  <ShieldAlert className="w-4 h-4" /> Action Required
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Counselor "Priya" is currently overloaded with 85 active leads, leading to a 14% drop in response speed. 
                  Recommend redistributing 20 leads to "Rahul" who has high conversion rates this week.
                </p>
                <button className="mt-3 text-xs bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600 transition-colors">
                  Approve Reassignment
                </button>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-emerald-500">
                  <TrendingUp className="w-4 h-4" /> Growth Opportunity
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Leads from "Facebook Ads - MBA Campaign" are showing a 40% higher conversion probability than average.
                  Consider increasing budget allocation by 15% for the next 7 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
