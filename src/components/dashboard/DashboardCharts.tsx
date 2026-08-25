import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { useTheme } from '../ThemeProvider';

const revenueData = [
  { name: 'Jan', revenue: 400000 },
  { name: 'Feb', revenue: 550000 },
  { name: 'Mar', revenue: 480000 },
  { name: 'Apr', revenue: 720000 },
  { name: 'May', revenue: 850000 },
  { name: 'Jun', revenue: 650000 },
  { name: 'Jul', revenue: 980000 },
];

const sourceData = [
  { name: 'Organic', value: 400 },
  { name: 'Social', value: 300 },
  { name: 'Referrals', value: 300 },
  { name: 'Direct', value: 200 },
  { name: 'Email', value: 100 },
];

const uniData = [
  { name: 'Amity', UG: 45, PG: 30 },
  { name: 'LPU', UG: 35, PG: 40 },
  { name: 'Manipal', UG: 25, PG: 20 },
  { name: 'CU', UG: 50, PG: 35 },
  { name: 'SRM', UG: 20, PG: 15 },
];

const PIE_COLORS = ['#E53935', '#FB8C00', '#43A047', '#1E88E5', '#8E24AA'];

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
              {entry.name === 'revenue' ? '₹' : ''}{entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function RevenueChart() {
  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Monthly Revenue</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue generated from admissions over time.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              tickFormatter={(value) => `₹${value / 100000}L`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="revenue" stroke="#E53935" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LeadsSourceChart() {
  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Leads by Source</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Acquisition channels.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sourceData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {sourceData.map((entry, index) => (
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
      </div>
    </div>
  );
}

export function AdmissionsByUniChart() {
  const { theme } = useTheme();
  const barColor = theme === 'dark' ? '#52525b' : '#94a3b8'; // zinc-600 / slate-400

  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-6 shadow-2xl h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Admissions by University</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Comparing UG and PG enrollments.</p>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={uniData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
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
      </div>
    </div>
  );
}
