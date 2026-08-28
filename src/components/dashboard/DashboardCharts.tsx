import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { useTheme } from '../ThemeProvider';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';

const PIE_COLORS = ['#E53935', '#FB8C00', '#43A047', '#1E88E5', '#8E24AA'];

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-lg">
        {label && <p className="text-sm font-semibold mb-2 text-foreground">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.name === 'revenue' ? `₹${entry.value.toLocaleString('en-IN')}` : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Revenue Chart ────────────────────────────────────────────────────────────
export function RevenueChart() {
  const { user } = useAuth();
  const [data, setData] = useState<{ name: string; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        // Fetch last 12 months of completed payments
        const since = new Date();
        since.setMonth(since.getMonth() - 11);
        since.setDate(1);
        since.setHours(0, 0, 0, 0);

        const { data: rows, error } = await supabase
          .from('payments')
          .select('amount, created_at')
          .eq('status', 'Completed')
          .gte('created_at', since.toISOString());

        if (error) throw error;

        // Build a map for each of the last 12 months
        const monthMap: Record<string, number> = {};
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = 0;
        }

        (rows || []).forEach((row: any) => {
          const d = new Date(row.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key in monthMap) monthMap[key] += row.amount || 0;
        });

        const chartData = Object.entries(monthMap).map(([key, revenue]) => ({
          name: SHORT_MONTHS[parseInt(key.split('-')[1]) - 1],
          revenue,
        }));

        setData(chartData);
      } catch (err) {
        console.error('[RevenueChart] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Monthly Revenue</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue generated from admissions over time.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px]">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53935" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E53935" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} dy={10} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} 
                tickFormatter={(v) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="revenue" stroke="#E53935" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Leads by Source Chart ────────────────────────────────────────────────────
export function LeadsSourceChart() {
  const { user } = useAuth();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const { data: rows, error } = await supabase
          .from('leads')
          .select('lead_source')
          .is('deleted_at', null);

        if (error) throw error;

        const counts: Record<string, number> = {};
        (rows || []).forEach((r: any) => {
          const src = r.lead_source || 'Unknown';
          counts[src] = (counts[src] || 0) + 1;
        });

        const chartData = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6) // top 6 sources
          .map(([name, value]) => ({ name, value }));

        setData(chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }]);
      } catch (err) {
        console.error('[LeadsSourceChart] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Leads by Source</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Acquisition channels.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px] relative">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value) => <span className="text-sm text-foreground font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Admissions by University Chart ──────────────────────────────────────────
export function AdmissionsByUniChart() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const barColor = theme === 'dark' ? '#52525b' : '#94a3b8';
  const [data, setData] = useState<{ name: string; UG: number; PG: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const { data: rows, error } = await supabase
          .from('admissions')
          .select('university_id, universities(name), courses(level)')
          .is('deleted_at', null)
          .neq('admission_status', 'Cancelled');

        if (error) throw error;

        const uniMap: Record<string, { name: string; UG: number; PG: number }> = {};
        (rows || []).forEach((r: any) => {
          const uniId = r.university_id;
          if (!uniId) return;
          const uniName: string = r.universities?.name || 'Unknown';
          // Abbreviate long university names to at most 8 chars
          const shortName = uniName.length > 8 ? uniName.substring(0, 8) : uniName;
          if (!uniMap[uniId]) uniMap[uniId] = { name: shortName, UG: 0, PG: 0 };
          const level: string = (r.courses?.level || '').toLowerCase();
          if (level.includes('ug') || level.includes('under') || level.includes('bachelor')) {
            uniMap[uniId].UG += 1;
          } else {
            uniMap[uniId].PG += 1;
          }
        });

        const chartData = Object.values(uniMap)
          .sort((a, b) => (b.UG + b.PG) - (a.UG + a.PG))
          .slice(0, 6);

        setData(chartData.length > 0 ? chartData : [{ name: 'No Data', UG: 0, PG: 0 }]);
      } catch (err) {
        console.error('[AdmissionsByUniChart] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Admissions by University</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Comparing UG and PG enrollments.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px]">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} />
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px' }}
                formatter={(value) => <span className="text-sm text-foreground font-medium">{value}</span>}
              />
              <Bar dataKey="UG" fill="#E53935" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="PG" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
