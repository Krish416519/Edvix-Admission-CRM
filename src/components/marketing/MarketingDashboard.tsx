import React, { useMemo } from 'react';
import { useMarketing } from '../../hooks/useMarketing';
import { 
  Megaphone, Target, ArrowUpRight, ArrowDownRight, 
  Users, IndianRupee, MousePointerClick, Activity, Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn } from '../../lib/utils';

const mockChartData = [
  { name: 'Jan', leads: 400, spend: 24000 },
  { name: 'Feb', leads: 300, spend: 13980 },
  { name: 'Mar', leads: 200, spend: 98000 },
  { name: 'Apr', leads: 278, spend: 39080 },
  { name: 'May', leads: 189, spend: 48000 },
  { name: 'Jun', leads: 239, spend: 38000 },
  { name: 'Jul', leads: 349, spend: 43000 },
];

export function MarketingDashboard() {
  const { campaigns, loading } = useMarketing();
  
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'Active'), [campaigns]);
  const totalLeads = useMemo(() => campaigns.reduce((sum, c) => sum + (c.metrics?.leadsGenerated || 0), 0), [campaigns]);
  const totalSpend = useMemo(() => campaigns.reduce((sum, c) => sum + (c.spend || 0), 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0), [campaigns]);
  const totalAdmissions = useMemo(() => campaigns.reduce((sum, c) => sum + (c.metrics?.admissions || 0), 0), [campaigns]);

  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const cpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(0) : '0';

  const stats = [
    { name: 'Total Leads Generated', value: totalLeads.toLocaleString(), change: '+14%', trend: 'up', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Cost Per Lead (CPL)', value: `₹${cpl}`, change: '-5%', trend: 'up', icon: MousePointerClick, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { name: 'ROAS', value: `${roas}x`, change: '+2.4x', trend: 'up', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Total Ad Spend', value: `₹${totalSpend.toLocaleString('en-IN')}`, change: '+12%', trend: 'down', icon: IndianRupee, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Marketing Overview</h1>
          <p className="text-muted-foreground mt-1">Track campaign performance, lead generation, and overall ROI.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-card border border-border text-sm rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm">
            <option>Last 30 Days</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
            <dt>
              <div className={cn("absolute rounded-lg p-3", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-muted-foreground">{stat.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className={cn(
                "ml-2 flex items-baseline text-sm font-semibold",
                stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 shrink-0 self-center" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 shrink-0 self-center" aria-hidden="true" />
                )}
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Lead Volume vs Spend</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area yAxisId="right" type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Active Campaigns</h2>
            <div className="space-y-4">
              {activeCampaigns.slice(0, 4).map((campaign) => (
                <div key={campaign.id} className="flex justify-between items-center group">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[150px]">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.platform}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-500">{campaign.metrics.leadsGenerated} Lds</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card shadow-sm p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-foreground">AI Insights</h2>
            </div>
            <p className="text-sm text-foreground/80 mb-3">
              Google Ads "B.Tech Search Intent" is performing 35% better than your average CPL. Consider reallocating ₹50,000 from Instagram Retargeting to maximize admissions.
            </p>
            <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Review Allocation →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
