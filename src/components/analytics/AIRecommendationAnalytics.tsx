import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, TrendingUp, Users, Target, BarChart2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export function AIRecommendationAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGenerated: 0,
    accepted: 0,
    rejected: 0,
    conversionRate: 0,
    avgScore: 0
  });

  const [topUniversities, setTopUniversities] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*');
        
      if (error) throw error;
      
      const total = data.length;
      const accepted = data.filter(d => d.status === 'Accepted').length;
      const rejected = data.filter(d => d.status === 'Rejected').length;
      const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
      
      // Calculate average score of selected universities
      let totalScore = 0;
      let scoreCount = 0;
      
      const uniCounts: Record<string, number> = {};
      
      data.forEach(rec => {
        if (rec.status === 'Accepted' && rec.selected_university_code) {
          const selected = rec.universities_recommended.find((u: any) => u.code === rec.selected_university_code);
          if (selected) {
            totalScore += selected.compatibilityScore;
            scoreCount++;
          }
        }
        
        // Count recommendations
        rec.universities_recommended.forEach((u: any) => {
          uniCounts[u.name] = (uniCounts[u.name] || 0) + 1;
        });
      });
      
      const topUnis = Object.entries(uniCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalGenerated: total,
        accepted,
        rejected,
        conversionRate,
        avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
      });
      
      setTopUniversities(topUnis);
      
    } catch (e) {
      console.error('Failed to load analytics', e);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f43f5e'];
  const pieData = [
    { name: 'Accepted', value: stats.accepted },
    { name: 'Pending', value: stats.totalGenerated - stats.accepted - stats.rejected },
    { name: 'Rejected', value: stats.rejected }
  ];

  if (loading) {
    return <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card"><Sparkles className="w-8 h-8 animate-pulse text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Recommendation Engine Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance of the automated matching system</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" /> Total Generated</div>
          <div className="text-3xl font-bold">{stats.totalGenerated}</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" /> Acceptance Rate</div>
          <div className="text-3xl font-bold">{stats.conversionRate}%</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Avg Match Score</div>
          <div className="text-3xl font-bold">{stats.avgScore}%</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <div className="text-sm text-muted-foreground font-medium mb-1 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-amber-500" /> Active Recommendations</div>
          <div className="text-3xl font-bold">{stats.totalGenerated - stats.accepted - stats.rejected}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-6">Most Recommended Universities</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topUniversities} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="opacity-10" />
                <XAxis type="number" stroke="currentColor" className="opacity-50 text-xs" />
                <YAxis dataKey="name" type="category" stroke="currentColor" className="opacity-70 text-xs" width={150} />
                <RechartsTooltip 
                  cursor={{fill: 'var(--primary)', opacity: 0.1}}
                  contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-semibold mb-6">Recommendation Funnel</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '0.5rem'}} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-4">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Accepted</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-500"></div> Pending</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Rejected</div>
          </div>
        </div>
      </div>
    </div>
  );
}
