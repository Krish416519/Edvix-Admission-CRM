import React from 'react';
import { useMarketing } from '../../hooks/useMarketing';
import { TrendingUp, PieChart as PieChartIcon, IndianRupee, Target, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export function RoiDashboard() {
  const { campaigns, loading } = useMarketing();

  const chartData = campaigns.map(c => ({
    name: c.platform,
    spend: c.spend,
    revenue: c.metrics?.revenue || 0,
    roi: c.spend > 0 ? (((c.metrics?.revenue || 0) - c.spend) / c.spend) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);

  const pieData = campaigns.reduce((acc: any[], c) => {
    const existing = acc.find(x => x.name === c.platform);
    if (existing) {
      existing.value += (c.metrics?.admissions || 0);
    } else {
      acc.push({ name: c.platform, value: (c.metrics?.admissions || 0) });
    }
    return acc;
  }, [] as { name: string, value: number }[]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">ROI & Attribution</h1>
          <p className="text-muted-foreground mt-1">Analyze revenue generated vs ad spend across all platforms.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Spend vs Revenue</h2>
            <IndianRupee className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                />
                <Legend />
                <Bar dataKey="spend" name="Ad Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Admission Attribution</h2>
            <PieChartIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem', color: 'var(--foreground)' }}
                  formatter={(value: number) => [`${value} Admissions`, 'Attributed']}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-lg font-semibold text-foreground">Platform Performance breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Platform</th>
                <th className="px-6 py-3 font-medium text-right">Ad Spend</th>
                <th className="px-6 py-3 font-medium text-right">Leads</th>
                <th className="px-6 py-3 font-medium text-right">CPL</th>
                <th className="px-6 py-3 font-medium text-right">Admissions</th>
                <th className="px-6 py-3 font-medium text-right">Revenue</th>
                <th className="px-6 py-3 font-medium text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {chartData.map((data, i) => {
                const platformCampaigns = mockCampaigns.filter(c => c.platform === data.name);
                const leads = platformCampaigns.reduce((sum, c) => sum + c.metrics.leadsGenerated, 0);
                const cpl = leads > 0 ? (data.spend / leads).toFixed(0) : '0';
                const admissions = platformCampaigns.reduce((sum, c) => sum + c.metrics.admissions, 0);
                const roas = data.spend > 0 ? (data.revenue / data.spend).toFixed(2) : '0';
                
                return (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{data.name}</td>
                    <td className="px-6 py-4 text-right">₹{data.spend.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{leads.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">₹{cpl}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-500">{admissions}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-500">₹{data.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">{roas}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
